import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EventMessageService } from '../../services/eventMessageService';
import { useToast } from '../Toast';
import { MessageSquare, Send, Lock, Unlock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export const EventMessages = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [chatStatuses, setChatStatuses] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'organizer' && user?.role !== 'admin') {
      navigate('/');
      return;
    }

    loadConversations();
    loadTotalUnreadCount();
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      // Set up real-time subscription
      const channel = supabase
        .channel(`event_messages:${selectedConversation.event_id}:${selectedConversation.participant_id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'event_messages',
          filter: `event_id=eq.${selectedConversation.event_id}`
        }, () => {
          loadMessages();
          loadTotalUnreadCount();
          markAsRead();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const result = await EventMessageService.getOrganizerConversations(user.id);

      if (result.error) {
        toast.error(result.error);
        setConversations([]);
      } else {
        setConversations(result.conversations || []);
      }
    } catch (error) {
      toast.error('Failed to load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTotalUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const result = await EventMessageService.getUnreadCount(user.id);
      if (!result.error && result.count !== undefined) {
        setTotalUnreadCount(result.count);
      }
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedConversation || !user?.id) return;

    try {
      // Load chat status
      const statusResult = await EventMessageService.getChatSettings(selectedConversation.event_id);
      if (!statusResult.error && statusResult.isOpen !== undefined) {
        setChatStatuses(prev => ({ ...prev, [selectedConversation.event_id]: statusResult.isOpen }));
      }

      const result = await EventMessageService.getEventMessages(
        selectedConversation.event_id,
        user.id
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        // Filter messages for this specific participant
        const participantMessages = (result.messages || []).filter(
          msg => msg.participant_id === selectedConversation.participant_id
        );
        setMessages(participantMessages);
        markAsRead();
      }
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const markAsRead = async () => {
    if (!selectedConversation || !user?.id) return;

    await EventMessageService.markMessagesAsRead(
      selectedConversation.event_id,
      user.id
    );
    loadTotalUnreadCount();
    loadConversations();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id || sending) return;

    try {
      setSending(true);
      const result = await EventMessageService.sendMessage(
        selectedConversation.event_id,
        user.id,
        newMessage
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        setNewMessage('');
        setMessages(prev => [...prev, result.message]);
        loadTotalUnreadCount();
        loadConversations();
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const toggleChatStatus = async (eventId) => {
    if (!user?.id) return;

    const currentStatus = chatStatuses[eventId] ?? true;
    const newStatus = !currentStatus;

    try {
      const result = await EventMessageService.updateChatSettings(
        eventId,
        user.id,
        newStatus
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        setChatStatuses(prev => ({ ...prev, [eventId]: newStatus }));
        toast.success(`Chat ${newStatus ? 'opened' : 'closed'} successfully`);
        loadConversations();
      }
    } catch (error) {
      toast.error('Failed to update chat status');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get unique events for filter
  const uniqueEvents = Array.from(new Set(conversations.map(c => c.event_id)))
    .map(eventId => {
      const conv = conversations.find(c => c.event_id === eventId);
      return conv?.event;
    })
    .filter(Boolean);

  // Filter conversations
  const filteredConversations = eventFilter === 'all'
    ? conversations
    : conversations.filter(c => c.event_id === eventFilter);

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading conversations...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Event Messages</h1>
              <p className="text-slate-600">
                Manage conversations with participants for your events
              </p>
            </div>
            {totalUnreadCount > 0 && (
              <div className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold">
                {totalUnreadCount} Unread
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            {/* Filter */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Filter by Event</label>
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Events</option>
                {uniqueEvents.map(event => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </div>

            {/* Conversations */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-slate-600">
                  <MessageSquare size={48} className="mx-auto mb-4 text-slate-400" />
                  <p>No conversations found</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={`${conv.event_id}_${conv.participant_id}`}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors border ${selectedConversation?.event_id === conv.event_id &&
                        selectedConversation?.participant_id === conv.participant_id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 text-sm line-clamp-1">
                          {conv.event?.title || 'Event'}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          {conv.participant?.first_name && conv.participant?.last_name
                            ? `${conv.participant.first_name} ${conv.participant.last_name}`
                            : conv.participant?.email || 'Participant'}
                        </p>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <p className="text-xs text-slate-600 line-clamp-2 mt-2">
                        {conv.last_message.message}
                      </p>
                    )}
                    <div className="text-xs text-slate-500 mt-2">
                      {conv.last_message_at ? formatTime(conv.last_message_at) : 'No messages'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col" style={{ height: '700px' }}>
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        {selectedConversation.event?.title || 'Event'}
                      </h2>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm text-slate-600">
                          Participant: {selectedConversation.participant?.first_name && selectedConversation.participant?.last_name
                            ? `${selectedConversation.participant.first_name} ${selectedConversation.participant.last_name}`
                            : selectedConversation.participant?.email || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {chatStatuses[selectedConversation.event_id] === false ? (
                        <button
                          onClick={() => toggleChatStatus(selectedConversation.event_id)}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                          title="Open chat"
                        >
                          <Unlock size={16} />
                          Open Chat
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleChatStatus(selectedConversation.event_id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
                          title="Close chat"
                        >
                          <Lock size={16} />
                          Close Chat
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-slate-600">
                      <MessageSquare size={48} className="mx-auto mb-4 text-slate-400" />
                      <p>No messages yet</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwnMessage = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-4 ${message.sender_id === user?.id
                                ? 'bg-blue-900 text-white'
                                : 'bg-white text-slate-800 border border-slate-200'
                              }`}
                          >
                            <div className="text-sm font-semibold mb-1">
                              {message.sender?.first_name && message.sender?.last_name
                                ? `${message.sender.first_name} ${message.sender.last_name}`
                                : message.sender?.email || 'User'}
                            </div>
                            <div className="text-sm whitespace-pre-wrap">{message.message}</div>
                            <div className={`text-xs mt-2 ${isOwnMessage ? 'text-blue-200' : 'text-slate-500'}`}>
                              {formatTime(message.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-6 border-t border-slate-200">
                  <div className="flex gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send size={20} />
                      Send
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Press Ctrl+Enter to send</p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600">
                <div className="text-center">
                  <MessageSquare size={64} className="mx-auto mb-4 text-slate-400" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
