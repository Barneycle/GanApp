import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EventMessageService } from '../../services/eventMessageService';
import { useToast } from '../Toast';
import { MessageSquare, Send, Lock, Unlock, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Swal from 'sweetalert2';

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
  const [deletingAll, setDeletingAll] = useState(false);
  const [markedConversations, setMarkedConversations] = useState(new Set());
  const messagesEndRef = useRef(null);
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);
  const loadedUserIdRef = useRef(null);

  // Helper functions
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const isMarked = (eventId, participantId) => {
    return markedConversations.has(`${eventId}_${participantId}`);
  };

  // Load conversations function
  const loadConversations = useCallback(async (force = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Prevent concurrent loads
    if (isLoadingRef.current && !force) return;

    try {
      isLoadingRef.current = true;
      setLoading(true);
      const result = await EventMessageService.getOrganizerConversations(user.id);

      if (!isMountedRef.current) {
        isLoadingRef.current = false;
        return;
      }

      if (result.error) {
        toast.error(result.error);
        setConversations([]);
      } else {
        setConversations(result.conversations || []);
      }
    } catch (error) {
      if (!isMountedRef.current) {
        isLoadingRef.current = false;
        return;
      }
      toast.error('Failed to load conversations');
      setConversations([]);
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id, toast]);

  const loadTotalUnreadCount = useCallback(async () => {
    if (!user?.id || !isMountedRef.current) return;

    try {
      const result = await EventMessageService.getUnreadCount(user.id);
      if (!isMountedRef.current) return;
      if (!result.error && result.count !== undefined) {
        setTotalUnreadCount(result.count);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to load unread count:', error);
    }
  }, [user?.id]);

  const loadMessages = useCallback(async () => {
    if (!selectedConversation || !user?.id || !isMountedRef.current) return;

    try {
      // Load chat status for this specific participant thread
      const statusResult = await EventMessageService.getChatSettings(
        selectedConversation.event_id,
        selectedConversation.participant_id
      );
      if (!statusResult.error && statusResult.isOpen !== undefined && isMountedRef.current) {
        const threadKey = `${selectedConversation.event_id}_${selectedConversation.participant_id}`;
        setChatStatuses(prev => ({ ...prev, [threadKey]: statusResult.isOpen }));
      }

      const result = await EventMessageService.getEventMessages(
        selectedConversation.event_id,
        user.id
      );

      if (!isMountedRef.current) return;

      if (result.error) {
        toast.error(result.error);
      } else {
        // Filter messages for this specific participant
        const participantMessages = (result.messages || []).filter(
          msg => msg.participant_id === selectedConversation.participant_id
        );
        setMessages(participantMessages);

        // Mark as read after loading messages
        if (isMountedRef.current) {
          EventMessageService.markMessagesAsRead(selectedConversation.event_id, user.id).catch(console.error);
          loadTotalUnreadCount();
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      toast.error('Failed to load messages');
    }
  }, [selectedConversation?.event_id, selectedConversation?.participant_id, user?.id, toast, loadTotalUnreadCount]);

  const markAsRead = useCallback(async () => {
    if (!selectedConversation || !user?.id || !isMountedRef.current) return;

    await EventMessageService.markMessagesAsRead(
      selectedConversation.event_id,
      user.id
    );
    if (isMountedRef.current) {
      loadTotalUnreadCount();
    }
  }, [selectedConversation?.event_id, user?.id, loadTotalUnreadCount]);

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
        if (isMountedRef.current) {
          loadTotalUnreadCount();
        }
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const toggleChatStatus = async (eventId, participantId) => {
    if (!user?.id || !selectedConversation) return;

    const threadKey = `${eventId}_${participantId}`;
    const currentStatus = chatStatuses[threadKey] ?? true;
    const newStatus = !currentStatus;

    try {
      const result = await EventMessageService.updateChatSettings(
        eventId,
        participantId,
        user.id,
        newStatus
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        setChatStatuses(prev => ({ ...prev, [threadKey]: newStatus }));
        toast.success(`Thread ${newStatus ? 'opened' : 'closed'} successfully`);
      }
    } catch (error) {
      toast.error('Failed to update chat status');
    }
  };

  const handleDeleteAllMessages = async () => {
    if (!selectedConversation || !user?.id) return;

    const result = await Swal.fire({
      title: 'Delete Conversation Thread?',
      text: 'Are you sure you want to delete ALL messages in this conversation thread? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete All',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setDeletingAll(true);
      const deleteResult = await EventMessageService.deleteAllMessages(
        selectedConversation.event_id,
        user.id,
        selectedConversation.participant_id
      );

      if (deleteResult.error) {
        toast.error(deleteResult.error);
        await Swal.fire({
          title: 'Error',
          text: deleteResult.error,
          icon: 'error',
          confirmButtonColor: '#1e40af',
        });
      } else {
        toast.success('All messages deleted successfully');
        await Swal.fire({
          title: 'Deleted!',
          text: 'All messages in this thread have been deleted.',
          icon: 'success',
          confirmButtonColor: '#1e40af',
        });
        setMessages([]);
        setSelectedConversation(null);
        setMarkedConversations(new Set());
        setTimeout(() => {
          if (isMountedRef.current) {
            loadTotalUnreadCount();
            loadConversations(true);
          }
        }, 500);
      }
    } catch (error) {
      toast.error('Failed to delete messages');
      await Swal.fire({
        title: 'Error',
        text: 'Failed to delete messages. Please try again.',
        icon: 'error',
        confirmButtonColor: '#1e40af',
      });
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDeleteMarkedConversations = async () => {
    if (markedConversations.size === 0 || !user?.id) return;

    const result = await Swal.fire({
      title: 'Delete Marked Conversations?',
      text: `Are you sure you want to delete ALL messages in ${markedConversations.size} marked conversation thread(s)? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, Delete ${markedConversations.size} Thread(s)`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setDeletingAll(true);
      let successCount = 0;
      let errorCount = 0;

      for (const key of markedConversations) {
        const [eventId, participantId] = key.split('_');
        const deleteResult = await EventMessageService.deleteAllMessages(
          eventId,
          user.id,
          participantId
        );

        if (deleteResult.error) {
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (errorCount > 0) {
        toast.error(`${successCount} deleted, ${errorCount} failed`);
        await Swal.fire({
          title: 'Partial Success',
          text: `${successCount} conversation(s) deleted successfully. ${errorCount} failed.`,
          icon: 'warning',
          confirmButtonColor: '#1e40af',
        });
      } else {
        toast.success(`${successCount} conversation(s) deleted successfully`);
        await Swal.fire({
          title: 'Deleted!',
          text: `${successCount} conversation thread(s) have been deleted.`,
          icon: 'success',
          confirmButtonColor: '#1e40af',
        });
      }

      const deletedKeys = Array.from(markedConversations);
      setMarkedConversations(new Set());

      if (selectedConversation) {
        const selectedKey = `${selectedConversation.event_id}_${selectedConversation.participant_id}`;
        if (deletedKeys.includes(selectedKey)) {
          setSelectedConversation(null);
          setMessages([]);
        }
      }

      setTimeout(() => {
        if (isMountedRef.current) {
          loadTotalUnreadCount();
          loadConversations(true);
        }
      }, 500);
    } catch (error) {
      toast.error('Failed to delete conversations');
      await Swal.fire({
        title: 'Error',
        text: 'Failed to delete conversations. Please try again.',
        icon: 'error',
        confirmButtonColor: '#1e40af',
      });
    } finally {
      setDeletingAll(false);
    }
  };

  const toggleMarkConversation = (eventId, participantId) => {
    const key = `${eventId}_${participantId}`;
    setMarkedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initialize data on mount
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (!isAuthenticated) {
        navigate('/login');
      }
      return;
    }

    if (user.role !== 'organizer' && user.role !== 'admin') {
      navigate('/');
      return;
    }

    if (user.id && loadedUserIdRef.current !== user.id) {
      loadedUserIdRef.current = user.id;
      loadConversations(true);
      loadTotalUnreadCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, user?.role]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    loadMessages();

    const channelName = `event_messages:${selectedConversation.event_id}:${selectedConversation.participant_id}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_messages',
        filter: `event_id=eq.${selectedConversation.event_id}`
      }, () => {
        if (isMountedRef.current) {
          loadMessages();
          loadTotalUnreadCount();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.event_id, selectedConversation?.participant_id, loadMessages, loadTotalUnreadCount]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSelectAll = () => {
    if (markedConversations.size === filteredConversations.length) {
      setMarkedConversations(new Set());
    } else {
      const allKeys = new Set(
        filteredConversations.map(conv => `${conv.event_id}_${conv.participant_id}`)
      );
      setMarkedConversations(allKeys);
    }
  };

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

            {/* Action Buttons */}
            <div className="mb-4 space-y-2">
              {filteredConversations.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                >
                  {markedConversations.size === filteredConversations.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
              {markedConversations.size > 0 && (
                <button
                  onClick={handleDeleteMarkedConversations}
                  disabled={deletingAll}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`Delete ${markedConversations.size} marked conversation(s)`}
                >
                  <Trash2 size={16} />
                  {deletingAll ? 'Deleting...' : `Delete (${markedConversations.size})`}
                </button>
              )}
            </div>

            {/* Conversations */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-slate-600">
                  <MessageSquare size={48} className="mx-auto mb-4 text-slate-400" />
                  <p>No conversations found</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedConversation?.event_id === conv.event_id &&
                    selectedConversation?.participant_id === conv.participant_id;
                  const isChecked = isMarked(conv.event_id, conv.participant_id);
                  const convKey = `${conv.event_id}_${conv.participant_id}`;

                  return (
                    <div
                      key={convKey}
                      className={`p-4 rounded-lg transition-colors border flex items-start gap-3 ${isSelected
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleMarkConversation(conv.event_id, conv.participant_id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      {/* Conversation Content */}
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => setSelectedConversation(conv)}
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
                    </div>
                  );
                })
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
                      {selectedConversation && messages.length > 0 && (
                        <button
                          onClick={handleDeleteAllMessages}
                          disabled={deletingAll}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete all messages in this thread"
                        >
                          <Trash2 size={16} />
                          {deletingAll ? 'Deleting...' : 'Delete Thread'}
                        </button>
                      )}
                      {(() => {
                        const threadKey = `${selectedConversation.event_id}_${selectedConversation.participant_id}`;
                        const isClosed = chatStatuses[threadKey] === false;
                        return isClosed ? (
                          <button
                            onClick={() => toggleChatStatus(selectedConversation.event_id, selectedConversation.participant_id)}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                            title="Open thread"
                          >
                            <Unlock size={16} />
                            Open Thread
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleChatStatus(selectedConversation.event_id, selectedConversation.participant_id)}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
                            title="Close thread"
                          >
                            <Lock size={16} />
                            Close Thread
                          </button>
                        );
                      })()}
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
