import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SupportService } from '../../services/supportService';
import { useToast } from '../Toast';
import { MessageSquare, Plus, Send, Clock, AlertCircle, CheckCircle, XCircle, Filter } from 'lucide-react';

export const Support = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState('normal');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Set admin status synchronously
    const adminStatus = user?.role === 'admin';
    setIsAdmin(adminStatus);
  }, [isAuthenticated, navigate, user?.role]);

  const selectedTicketIdRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const loadingTicketsRef = useRef(false);

  const loadTickets = async (preserveSelection = true) => {
    if (!isAuthenticated || !user || loadingTicketsRef.current) return;
    
    try {
      loadingTicketsRef.current = true;
      setLoading(true);
      const result = isAdmin
        ? await SupportService.getAllTickets(statusFilter !== 'all' ? statusFilter : undefined, priorityFilter !== 'all' ? priorityFilter : undefined)
        : await SupportService.getUserTickets();

      if (result.error) {
        toast.error(result.error);
        setTickets([]);
      } else {
        const newTickets = result.tickets || [];
        setTickets(newTickets);
        
        // Only set selectedTicket if we don't have one, or if the current one no longer exists
        if (newTickets.length > 0) {
          setSelectedTicket(prev => {
            if (!prev || !preserveSelection) {
              return newTickets[0];
            }
            // Check if current selected ticket still exists in the list
            const ticketStillExists = newTickets.some(t => t.id === prev.id);
            if (!ticketStillExists) {
              // Current ticket no longer exists, select first one
              return newTickets[0];
            } else {
              // Update selected ticket with latest data
              const updatedTicket = newTickets.find(t => t.id === prev.id);
              if (updatedTicket) {
                // Only update if data actually changed (check key fields)
                if (prev.status !== updatedTicket.status || 
                    prev.priority !== updatedTicket.priority ||
                    prev.updated_at !== updatedTicket.updated_at ||
                    prev.message_count !== updatedTicket.message_count) {
                  return updatedTicket;
                }
              }
              return prev; // No change needed
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load tickets');
      setTickets([]);
    } finally {
      setLoading(false);
      loadingTicketsRef.current = false;
    }
  };

  useEffect(() => {
    if (isAuthenticated && user && !loadingTicketsRef.current) {
      const shouldPreserve = !isInitialLoadRef.current;
      loadTickets(shouldPreserve);
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, isAdmin, statusFilter, priorityFilter]);

  useEffect(() => {
    if (selectedTicket?.id && selectedTicket.id !== selectedTicketIdRef.current) {
      selectedTicketIdRef.current = selectedTicket.id;
      loadTicketMessages(selectedTicket.id);
      // Mark messages as read
      SupportService.markMessagesAsRead(selectedTicket.id);
    }
  }, [selectedTicket?.id]);

  const loadingMessagesRef = useRef(false);

  const loadTicketMessages = async (ticketId) => {
    if (!ticketId || loadingMessagesRef.current) return;
    
    try {
      loadingMessagesRef.current = true;
      const result = await SupportService.getTicketById(ticketId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setMessages(result.messages || []);
        // Only update selectedTicket if it's a different ticket or if status changed
        if (result.ticket) {
          setSelectedTicket(prev => {
            if (!prev || prev.id !== result.ticket.id) {
              return result.ticket;
            }
            // Only update if status or other important fields changed
            if (prev.status !== result.ticket.status || 
                prev.priority !== result.ticket.priority ||
                prev.updated_at !== result.ticket.updated_at) {
              return result.ticket;
            }
            return prev; // No change needed
          });
        }
      }
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      loadingMessagesRef.current = false;
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSending(true);
      const result = await SupportService.createTicket(
        newTicketSubject,
        newTicketMessage,
        newTicketCategory || undefined,
        newTicketPriority
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Ticket created successfully');
        setShowNewTicketModal(false);
        setNewTicketSubject('');
        setNewTicketMessage('');
        setNewTicketCategory('');
        setNewTicketPriority('normal');
        await loadTickets();
        // The newly created ticket should be first in the list after loadTickets()
        // so it will be automatically selected by the loadTickets logic
      }
    } catch (error) {
      toast.error('Failed to create ticket');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) {
      return;
    }

    try {
      setSending(true);
      const result = await SupportService.addMessage(selectedTicket.id, newMessage);

      if (result.error) {
        toast.error(result.error);
      } else {
        setNewMessage('');
        // Reload messages without reloading tickets to avoid loops
        await loadTicketMessages(selectedTicket.id);
        // Update tickets list without changing selectedTicket
        const ticketResult = isAdmin
          ? await SupportService.getAllTickets(statusFilter !== 'all' ? statusFilter : undefined, priorityFilter !== 'all' ? priorityFilter : undefined)
          : await SupportService.getUserTickets();
        if (!ticketResult.error && ticketResult.tickets) {
          setTickets(ticketResult.tickets);
          // Update selectedTicket with latest data if it exists
          const updatedTicket = ticketResult.tickets.find(t => t.id === selectedTicket.id);
          if (updatedTicket) {
            setSelectedTicket(updatedTicket);
          }
        }
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedTicket || !isAdmin) return;

    try {
      setSending(true);
      const result = await SupportService.updateTicketStatus(selectedTicket.id, status);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Ticket status updated');
        // Update the selected ticket directly without reloading all tickets
        if (result.ticket) {
          setSelectedTicket(result.ticket);
        }
        // Silently update tickets list without changing selectedTicket
        const ticketResult = await SupportService.getAllTickets(statusFilter !== 'all' ? statusFilter : undefined, priorityFilter !== 'all' ? priorityFilter : undefined);
        if (!ticketResult.error && ticketResult.tickets) {
          setTickets(ticketResult.tickets);
        }
      }
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading support tickets...</p>
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
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Support Center</h1>
              <p className="text-slate-600">
                {isAdmin ? 'Manage support tickets from users' : 'Get help from our support team'}
              </p>
            </div>
            {!isAdmin && (
              <button
                onClick={() => setShowNewTicketModal(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-colors font-medium"
              >
                <Plus size={20} />
                <span>New Ticket</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            {/* Filters */}
            {isAdmin && (
              <div className="mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => {
                      setPriorityFilter(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="all">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            )}

            {/* Tickets */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {tickets.length === 0 ? (
                <div className="text-center py-8 text-slate-600">
                  <MessageSquare size={48} className="mx-auto mb-4 text-slate-400" />
                  <p>No tickets found</p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors border ${
                      selectedTicket?.id === ticket.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-800 text-sm line-clamp-2">{ticket.subject}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className={`px-2 py-1 rounded ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span>{formatDate(ticket.created_at)}</span>
                    </div>
                    {isAdmin && ticket.user && (
                      <div className="mt-2 text-xs text-slate-600">
                        From: {ticket.user.first_name && ticket.user.last_name 
                          ? `${ticket.user.first_name} ${ticket.user.last_name} (${ticket.user.email})`
                          : ticket.user.email || ticket.user_id}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col" style={{ height: '700px' }}>
            {selectedTicket ? (
              <>
                {/* Ticket Header */}
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedTicket.subject}</h2>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTicket.status)}`}>
                          {selectedTicket.status.replace('_', ' ')}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                          {selectedTicket.priority}
                        </span>
                        {selectedTicket.category && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                            {selectedTicket.category}
                          </span>
                        )}
                        <span className="text-sm text-slate-600">
                          Created {formatDate(selectedTicket.created_at)}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateStatus(e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender?.id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-4 ${
                          message.sender?.id === user?.id
                            ? 'bg-blue-900 text-white'
                            : message.is_internal
                            ? 'bg-yellow-100 text-yellow-900 border-2 border-yellow-300'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {message.is_internal && (
                          <div className="text-xs font-semibold mb-1 text-yellow-800">INTERNAL NOTE</div>
                        )}
                        <div className="text-sm font-semibold mb-1">
                          {message.sender?.first_name && message.sender?.last_name 
                            ? `${message.sender.first_name} ${message.sender.last_name} (${message.sender.role || 'user'})`
                            : message.sender?.email || 'User'}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{message.message}</div>
                        <div className={`text-xs mt-2 ${message.sender?.id === user?.id ? 'text-blue-200' : 'text-slate-500'}`}>
                          {formatDate(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                {selectedTicket.status !== 'closed' && (
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
                            handleSendMessage();
                          }
                        }}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send size={20} />
                        Send
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Press Ctrl+Enter to send</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600">
                <div className="text-center">
                  <MessageSquare size={64} className="mx-auto mb-4 text-slate-400" />
                  <p>Select a ticket to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New Ticket Modal */}
        {showNewTicketModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Create New Support Ticket</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Subject *</label>
                  <input
                    type="text"
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                    placeholder="Brief description of your issue..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={newTicketCategory}
                    onChange={(e) => setNewTicketCategory(e.target.value)}
                    placeholder="e.g., Technical, Billing, General..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
                  <select
                    value={newTicketPriority}
                    onChange={(e) => setNewTicketPriority(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Message *</label>
                  <textarea
                    value={newTicketMessage}
                    onChange={(e) => setNewTicketMessage(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    rows={6}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowNewTicketModal(false);
                    setNewTicketSubject('');
                    setNewTicketMessage('');
                    setNewTicketCategory('');
                    setNewTicketPriority('normal');
                  }}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTicket}
                  disabled={sending || !newTicketSubject.trim() || !newTicketMessage.trim()}
                  className="flex-1 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
