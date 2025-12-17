import React, { useState, useEffect, useRef } from 'react';
import { EventMessageService } from '../services/eventMessageService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { supabase } from '../lib/supabaseClient';
import { Send, X, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

export const EventChatModal = ({ isOpen, onClose, eventId, eventTitle }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatIsOpen, setChatIsOpen] = useState(true);
  const [loadingChatStatus, setLoadingChatStatus] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen && eventId && user?.id) {
      checkIfOrganizer();
      loadChatStatus();
      loadMessages();
      // Set up real-time subscription
      const channel = supabase
        .channel(`event_messages:${eventId}:${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'event_messages',
          filter: `event_id=eq.${eventId}`
        }, () => {
          loadMessages();
          // Mark as read if organizer
          if (user?.id) {
            EventMessageService.markMessagesAsRead(eventId, user.id).catch(console.error);
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_chat_settings',
          filter: `event_id=eq.${eventId}`
        }, () => {
          loadChatStatus();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, eventId, user?.id]);

  const checkIfOrganizer = async () => {
    if (!eventId || !user?.id) return;
    try {
      const { data: event } = await supabase
        .from('events')
        .select('created_by')
        .eq('id', eventId)
        .single();

      if (event) {
        setIsOrganizer(event.created_by === user.id);
      }
    } catch (error) {
      console.error('Failed to check if organizer:', error);
      setIsOrganizer(false);
    }
  };

  const loadChatStatus = async () => {
    if (!eventId || !user?.id) return;
    try {
      setLoadingChatStatus(true);
      // For participants, user.id is the participant_id
      const result = await EventMessageService.getChatSettings(eventId, user.id);
      if (!result.error && result.isOpen !== undefined) {
        setChatIsOpen(result.isOpen);
      }
    } catch (error) {
      console.error('Failed to load chat status:', error);
    } finally {
      setLoadingChatStatus(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!eventId || !user?.id) return;

    try {
      setLoading(true);
      const result = await EventMessageService.getEventMessages(eventId, user.id);

      if (result.error) {
        toast.error(result.error);
      } else {
        setMessages(result.messages || []);
        // Mark as read if organizer
        await EventMessageService.markMessagesAsRead(eventId, user.id);
      }
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !eventId || !user?.id || sending) return;

    try {
      setSending(true);
      const result = await EventMessageService.sendMessage(
        eventId,
        user.id,
        newMessage
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        setNewMessage('');
        setMessages(prev => [...prev, result.message]);
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
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

  const handleDeleteAllMessages = async () => {
    if (!eventId || !user?.id || !isOrganizer) return;

    // For organizers, get participant_id from the first message if available
    // If viewing all messages, this will delete all messages for the event
    const participantId = messages.length > 0 ? messages[0].participant_id : undefined;

    const result = await Swal.fire({
      title: 'Delete Conversation Thread?',
      text: 'Are you sure you want to delete ALL messages in this thread? This action cannot be undone.',
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
      const deleteResult = await EventMessageService.deleteAllMessages(eventId, user.id, participantId);

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
        loadMessages();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">
              Contact Organizer
            </h3>
            <p className="text-sm text-slate-600">{eventTitle}</p>
            {!chatIsOpen && (
              <div className="mt-2 px-3 py-1.5 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-xs text-yellow-800 font-medium">
                  ⚠️ Chat is currently closed by the organizer
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isOrganizer && messages.length > 0 && (
              <button
                onClick={handleDeleteAllMessages}
                disabled={deletingAll}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete all messages in this thread"
              >
                <Trash2 size={16} />
                {deletingAll ? 'Deleting...' : 'Delete Thread'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
        >
          {loading && messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-slate-600">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600">No messages yet. Start the conversation!</p>
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
                    className={`max-w-[70%] rounded-lg p-3 ${isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-800 border border-slate-200'
                      }`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {message.sender?.first_name && message.sender?.last_name
                        ? `${message.sender.first_name} ${message.sender.last_name}`
                        : message.sender?.email || 'User'}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{message.message}</div>
                    <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-slate-500'}`}>
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200 bg-white">
          {!chatIsOpen ? (
            <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-600">
                The chat for this event is currently closed. You cannot send messages at this time.
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={2}
                  disabled={sending || !chatIsOpen}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending || !chatIsOpen}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">Press Enter to send</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
