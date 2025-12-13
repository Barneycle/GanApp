import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/authContext';
import { useToast } from '../components/Toast';
import { SupportService, SupportTicket, SupportMessage } from '../lib/supportService';
import { Ionicons } from '@expo/vector-icons';

export default function Support() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const isAuthenticated = !!user;
    const toast = useToast();
    const insets = useSafeAreaInsets();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [showNewTicketModal, setShowNewTicketModal] = useState(false);
    const [newTicketSubject, setNewTicketSubject] = useState('');
    const [newTicketMessage, setNewTicketMessage] = useState('');
    const [newTicketCategory, setNewTicketCategory] = useState('');
    const [newTicketPriority, setNewTicketPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [isAdmin, setIsAdmin] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'chat'>('list');
    const [showStatusFilter, setShowStatusFilter] = useState(false);
    const [showPriorityFilter, setShowPriorityFilter] = useState(false);
    const [showStatusSelect, setShowStatusSelect] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const selectedTicketIdRef = useRef<string | null>(null);
    const loadingTicketsRef = useRef(false);
    const loadingMessagesRef = useRef(false);

    useEffect(() => {
        // Wait for auth to finish loading before checking
        if (isLoading) return;

        // Only redirect if we're absolutely sure user is not authenticated after loading
        if (!user) {
            // Add a delay to avoid race conditions with auth loading
            const timer = setTimeout(() => {
                router.replace('/login');
            }, 300);
            return () => clearTimeout(timer);
        }

        // User is authenticated, set admin status
        const adminStatus = user?.role === 'admin';
        setIsAdmin(adminStatus);
    }, [user, isLoading, router]);

    const loadTickets = async (preserveSelection = true) => {
        if (!user || loadingTicketsRef.current) return;

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

                if (newTickets.length > 0) {
                    setSelectedTicket(prev => {
                        if (!prev || !preserveSelection) {
                            return newTickets[0];
                        }
                        const ticketStillExists = newTickets.some(t => t.id === prev.id);
                        if (!ticketStillExists) {
                            return newTickets[0];
                        } else {
                            const updatedTicket = newTickets.find(t => t.id === prev.id);
                            if (updatedTicket) {
                                if (prev.status !== updatedTicket.status ||
                                    prev.priority !== updatedTicket.priority ||
                                    prev.updated_at !== updatedTicket.updated_at ||
                                    prev.message_count !== updatedTicket.message_count) {
                                    return updatedTicket;
                                }
                            }
                            return prev;
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
        if (user && !loadingTicketsRef.current && !isLoading) {
            loadTickets();
        }
    }, [user, isAdmin, statusFilter, priorityFilter, isLoading]);

    useEffect(() => {
        if (selectedTicket?.id && selectedTicket.id !== selectedTicketIdRef.current) {
            selectedTicketIdRef.current = selectedTicket.id;
            loadTicketMessages(selectedTicket.id);
            SupportService.markMessagesAsRead(selectedTicket.id);
        }
    }, [selectedTicket?.id]);

    // Handle hardware back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            // If in chat mode, go back to list mode
            if (viewMode === 'chat') {
                setViewMode('list');
                return true; // Prevent default behavior
            }
            // If in list mode, allow default behavior (close screen)
            return false;
        });

        return () => backHandler.remove();
    }, [viewMode]);

    const loadTicketMessages = async (ticketId: string) => {
        if (!ticketId || loadingMessagesRef.current) return;

        try {
            loadingMessagesRef.current = true;
            const result = await SupportService.getTicketById(ticketId);
            if (result.error) {
                toast.error(result.error);
            } else {
                setMessages(result.messages || []);
                if (result.ticket) {
                    setSelectedTicket(prev => {
                        if (!prev || prev.id !== result.ticket!.id) {
                            return result.ticket!;
                        }
                        if (prev.status !== result.ticket!.status ||
                            prev.priority !== result.ticket!.priority ||
                            prev.updated_at !== result.ticket!.updated_at) {
                            return result.ticket!;
                        }
                        return prev;
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
                await loadTicketMessages(selectedTicket.id);
                const ticketResult = isAdmin
                    ? await SupportService.getAllTickets(statusFilter !== 'all' ? statusFilter : undefined, priorityFilter !== 'all' ? priorityFilter : undefined)
                    : await SupportService.getUserTickets();
                if (!ticketResult.error && ticketResult.tickets) {
                    setTickets(ticketResult.tickets);
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

    const handleUpdateStatus = async (status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
        if (!selectedTicket || !isAdmin) return;

        try {
            setSending(true);
            const result = await SupportService.updateTicketStatus(selectedTicket.id, status);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Ticket status updated');
                if (result.ticket) {
                    setSelectedTicket(result.ticket);
                }
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open':
                return { bg: '#dbeafe', text: '#1e40af' };
            case 'in_progress':
                return { bg: '#fef3c7', text: '#92400e' };
            case 'resolved':
                return { bg: '#d1fae5', text: '#065f46' };
            case 'closed':
                return { bg: '#f3f4f6', text: '#374151' };
            default:
                return { bg: '#f3f4f6', text: '#374151' };
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return { bg: '#fee2e2', text: '#991b1b' };
            case 'high':
                return { bg: '#fed7aa', text: '#9a3412' };
            case 'normal':
                return { bg: '#dbeafe', text: '#1e40af' };
            case 'low':
                return { bg: '#f3f4f6', text: '#374151' };
            default:
                return { bg: '#f3f4f6', text: '#374151' };
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1e40af" />
                    <Text style={styles.loadingText}>Loading support tickets...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTickets();
        if (selectedTicket) {
            await loadTicketMessages(selectedTicket.id);
        }
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header - Only show in list mode */}
            {viewMode === 'list' && (
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: Math.max(insets.top, 8),
                            paddingBottom: 12,
                            paddingHorizontal: 16,
                        }
                    ]}
                >
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Support Center</Text>
                        <Text style={styles.headerSubtitle}>
                            {isAdmin ? 'Manage support tickets' : 'Get help from our support team'}
                        </Text>
                    </View>
                    {!isAdmin && (
                        <TouchableOpacity
                            onPress={() => setShowNewTicketModal(true)}
                            style={styles.newTicketButton}
                        >
                            <Ionicons name="add" size={24} color="#ffffff" />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {viewMode === 'list' ? (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#1e40af"
                            colors={["#1e40af"]}
                        />
                    }
                >
                    {/* Filters (Admin only) */}
                    {isAdmin && (
                        <View style={styles.filtersContainer}>
                            <View style={styles.filterRow}>
                                <Text style={styles.filterLabel}>Status</Text>
                                <TouchableOpacity
                                    onPress={() => setShowStatusFilter(true)}
                                    style={styles.filterSelect}
                                >
                                    <Text style={styles.filterSelectText}>{statusFilter === 'all' ? 'All Statuses' : statusFilter.replace('_', ' ')}</Text>
                                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.filterRow}>
                                <Text style={styles.filterLabel}>Priority</Text>
                                <TouchableOpacity
                                    onPress={() => setShowPriorityFilter(true)}
                                    style={styles.filterSelect}
                                >
                                    <Text style={styles.filterSelectText}>{priorityFilter === 'all' ? 'All Priorities' : priorityFilter}</Text>
                                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Tickets List */}
                    {tickets.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No tickets found</Text>
                        </View>
                    ) : (
                        tickets.map((ticket) => {
                            const statusColor = getStatusColor(ticket.status);
                            const priorityColor = getPriorityColor(ticket.priority);
                            const isSelected = selectedTicket?.id === ticket.id;

                            return (
                                <TouchableOpacity
                                    key={ticket.id}
                                    onPress={() => {
                                        setSelectedTicket(ticket);
                                        setViewMode('chat');
                                    }}
                                    style={[
                                        styles.ticketCard,
                                        isSelected && styles.ticketCardSelected
                                    ]}
                                >
                                    <View style={styles.ticketHeader}>
                                        <Text style={styles.ticketSubject} numberOfLines={2}>
                                            {ticket.subject}
                                        </Text>
                                        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                                            <Text style={[styles.statusText, { color: statusColor.text }]}>
                                                {ticket.status.replace('_', ' ')}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.ticketFooter}>
                                        <View style={[styles.priorityBadge, { backgroundColor: priorityColor.bg }]}>
                                            <Text style={[styles.priorityText, { color: priorityColor.text }]}>
                                                {ticket.priority}
                                            </Text>
                                        </View>
                                        <Text style={styles.ticketDate}>{formatDate(ticket.created_at)}</Text>
                                    </View>
                                    {isAdmin && ticket.user && (
                                        <Text style={styles.ticketUser}>
                                            From: {ticket.user.first_name && ticket.user.last_name
                                                ? `${ticket.user.first_name} ${ticket.user.last_name} (${ticket.user.email})`
                                                : ticket.user.email || ticket.user_id}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            ) : (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.chatContainer}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    {selectedTicket ? (
                        <>
                            {/* Ticket Header */}
                            <View
                                style={[
                                    styles.chatHeader,
                                    {
                                        paddingTop: Math.max(insets.top, 8),
                                        paddingBottom: 12,
                                        paddingHorizontal: 16,
                                    }
                                ]}
                            >
                                <TouchableOpacity
                                    onPress={() => setViewMode('list')}
                                    style={styles.backToListButton}
                                >
                                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                                </TouchableOpacity>
                                <View style={styles.chatHeaderContent}>
                                    <Text style={styles.chatTitle}>{selectedTicket.subject}</Text>
                                    <View style={styles.chatBadges}>
                                        <View style={[styles.badge, { backgroundColor: getStatusColor(selectedTicket.status).bg }]}>
                                            <Text style={[styles.badgeText, { color: getStatusColor(selectedTicket.status).text }]}>
                                                {selectedTicket.status.replace('_', ' ')}
                                            </Text>
                                        </View>
                                        <View style={[styles.badge, { backgroundColor: getPriorityColor(selectedTicket.priority).bg }]}>
                                            <Text style={[styles.badgeText, { color: getPriorityColor(selectedTicket.priority).text }]}>
                                                {selectedTicket.priority}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                {isAdmin && (
                                    <TouchableOpacity
                                        onPress={() => setShowStatusSelect(true)}
                                        style={styles.statusSelect}
                                    >
                                        <Text style={styles.statusSelectText}>{selectedTicket.status.replace('_', ' ')}</Text>
                                        <Ionicons name="chevron-down" size={16} color="#64748b" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Messages */}
                            <ScrollView
                                style={styles.messagesContainer}
                                contentContainerStyle={styles.messagesContent}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={onRefresh}
                                        tintColor="#1e40af"
                                        colors={["#1e40af"]}
                                    />
                                }
                            >
                                {messages.map((message) => {
                                    const isOwnMessage = message.sender?.id === user?.id;
                                    const isInternal = message.is_internal;

                                    return (
                                        <View
                                            key={message.id}
                                            style={[
                                                styles.messageContainer,
                                                isOwnMessage && styles.messageContainerRight
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.messageBubble,
                                                    isOwnMessage && styles.messageBubbleRight,
                                                    isInternal && styles.messageBubbleInternal
                                                ]}
                                            >
                                                {isInternal && (
                                                    <Text style={styles.internalLabel}>INTERNAL NOTE</Text>
                                                )}
                                                <Text style={styles.messageSender}>
                                                    {message.sender?.first_name && message.sender?.last_name
                                                        ? `${message.sender.first_name} ${message.sender.last_name} (${message.sender.role || 'user'})`
                                                        : message.sender?.email || 'User'}
                                                </Text>
                                                <Text style={[
                                                    styles.messageText,
                                                    isOwnMessage && styles.messageTextRight,
                                                    isInternal && styles.messageTextInternal
                                                ]}>
                                                    {message.message}
                                                </Text>
                                                <Text style={[
                                                    styles.messageDate,
                                                    isOwnMessage && styles.messageDateRight
                                                ]}>
                                                    {formatDate(message.created_at)}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>

                            {/* Message Input */}
                            {selectedTicket.status !== 'closed' && (
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.messageInput}
                                        placeholder="Type your message..."
                                        placeholderTextColor="#94a3b8"
                                        value={newMessage}
                                        onChangeText={setNewMessage}
                                        multiline
                                        numberOfLines={3}
                                    />
                                    <TouchableOpacity
                                        onPress={handleSendMessage}
                                        disabled={!newMessage.trim() || sending}
                                        style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
                                    >
                                        {sending ? (
                                            <ActivityIndicator size="small" color="#ffffff" />
                                        ) : (
                                            <Ionicons name="send" size={20} color="#ffffff" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.emptyChatContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyChatText}>Select a ticket to view messages</Text>
                        </View>
                    )}
                </KeyboardAvoidingView>
            )}

            {/* New Ticket Modal */}
            <Modal
                visible={showNewTicketModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowNewTicketModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Create New Support Ticket</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setShowNewTicketModal(false);
                                setNewTicketSubject('');
                                setNewTicketMessage('');
                                setNewTicketCategory('');
                                setNewTicketPriority('normal');
                            }}
                            style={styles.modalCloseButton}
                        >
                            <Ionicons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Subject *</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="Brief description of your issue..."
                                value={newTicketSubject}
                                onChangeText={setNewTicketSubject}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Category</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="e.g., Technical, Billing, General..."
                                value={newTicketCategory}
                                onChangeText={setNewTicketCategory}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Priority</Text>
                            <View style={styles.priorityButtons}>
                                {(['low', 'normal', 'high', 'urgent'] as const).map((priority) => (
                                    <TouchableOpacity
                                        key={priority}
                                        onPress={() => setNewTicketPriority(priority)}
                                        style={[
                                            styles.priorityButton,
                                            newTicketPriority === priority && styles.priorityButtonSelected
                                        ]}
                                    >
                                        <Text style={[
                                            styles.priorityButtonText,
                                            newTicketPriority === priority && styles.priorityButtonTextSelected
                                        ]}>
                                            {priority}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Message *</Text>
                            <TextInput
                                style={[styles.formInput, styles.formTextArea]}
                                placeholder="Describe your issue in detail..."
                                value={newTicketMessage}
                                onChangeText={setNewTicketMessage}
                                multiline
                                numberOfLines={6}
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            onPress={() => {
                                setShowNewTicketModal(false);
                                setNewTicketSubject('');
                                setNewTicketMessage('');
                                setNewTicketCategory('');
                                setNewTicketPriority('normal');
                            }}
                            style={styles.modalCancelButton}
                        >
                            <Text style={styles.modalCancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleCreateTicket}
                            disabled={sending || !newTicketSubject.trim() || !newTicketMessage.trim()}
                            style={[
                                styles.modalSubmitButton,
                                (sending || !newTicketSubject.trim() || !newTicketMessage.trim()) && styles.modalSubmitButtonDisabled
                            ]}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.modalSubmitButtonText}>Create Ticket</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Status Filter Modal */}
            <Modal
                visible={showStatusFilter}
                transparent
                animationType="slide"
                onRequestClose={() => setShowStatusFilter(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pickerModal}>
                        <Text style={styles.pickerTitle}>Filter by Status</Text>
                        {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
                            <TouchableOpacity
                                key={status}
                                onPress={() => {
                                    setStatusFilter(status);
                                    setShowStatusFilter(false);
                                }}
                                style={[
                                    styles.pickerOption,
                                    statusFilter === status && styles.pickerOptionSelected
                                ]}
                            >
                                <Text style={[
                                    styles.pickerOptionText,
                                    statusFilter === status && styles.pickerOptionTextSelected
                                ]}>
                                    {status === 'all' ? 'All Statuses' : status.replace('_', ' ')}
                                </Text>
                                {statusFilter === status && (
                                    <Ionicons name="checkmark" size={20} color="#1e40af" />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            onPress={() => setShowStatusFilter(false)}
                            style={styles.pickerCancelButton}
                        >
                            <Text style={styles.pickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Priority Filter Modal */}
            <Modal
                visible={showPriorityFilter}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPriorityFilter(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pickerModal}>
                        <Text style={styles.pickerTitle}>Filter by Priority</Text>
                        {['all', 'low', 'normal', 'high', 'urgent'].map((priority) => (
                            <TouchableOpacity
                                key={priority}
                                onPress={() => {
                                    setPriorityFilter(priority);
                                    setShowPriorityFilter(false);
                                }}
                                style={[
                                    styles.pickerOption,
                                    priorityFilter === priority && styles.pickerOptionSelected
                                ]}
                            >
                                <Text style={[
                                    styles.pickerOptionText,
                                    priorityFilter === priority && styles.pickerOptionTextSelected
                                ]}>
                                    {priority === 'all' ? 'All Priorities' : priority}
                                </Text>
                                {priorityFilter === priority && (
                                    <Ionicons name="checkmark" size={20} color="#1e40af" />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            onPress={() => setShowPriorityFilter(false)}
                            style={styles.pickerCancelButton}
                        >
                            <Text style={styles.pickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Status Select Modal (Admin) */}
            <Modal
                visible={showStatusSelect}
                transparent
                animationType="slide"
                onRequestClose={() => setShowStatusSelect(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pickerModal}>
                        <Text style={styles.pickerTitle}>Update Ticket Status</Text>
                        {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => (
                            <TouchableOpacity
                                key={status}
                                onPress={() => {
                                    handleUpdateStatus(status);
                                    setShowStatusSelect(false);
                                }}
                                style={[
                                    styles.pickerOption,
                                    selectedTicket?.status === status && styles.pickerOptionSelected
                                ]}
                            >
                                <Text style={[
                                    styles.pickerOptionText,
                                    selectedTicket?.status === status && styles.pickerOptionTextSelected
                                ]}>
                                    {status.replace('_', ' ')}
                                </Text>
                                {selectedTicket?.status === status && (
                                    <Ionicons name="checkmark" size={20} color="#1e40af" />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            onPress={() => setShowStatusSelect(false)}
                            style={styles.pickerCancelButton}
                        >
                            <Text style={styles.pickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748b',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    newTicketButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1e40af',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    filtersContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    filterRow: {
        marginBottom: 12,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 8,
    },
    filterSelect: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        backgroundColor: '#ffffff',
    },
    filterSelectText: {
        fontSize: 14,
        color: '#1e293b',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748b',
    },
    ticketCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    ticketCardSelected: {
        backgroundColor: '#eff6ff',
        borderColor: '#93c5fd',
    },
    ticketHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    ticketSubject: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    ticketFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    priorityText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    ticketDate: {
        fontSize: 12,
        color: '#64748b',
    },
    ticketUser: {
        marginTop: 8,
        fontSize: 12,
        color: '#64748b',
    },
    chatContainer: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backToListButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    chatHeaderContent: {
        flex: 1,
    },
    chatTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    chatBadges: {
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    statusSelect: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
    },
    statusSelectText: {
        fontSize: 14,
        color: '#1e293b',
        marginRight: 4,
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    messagesContent: {
        padding: 16,
    },
    messageContainer: {
        marginBottom: 16,
        alignItems: 'flex-start',
    },
    messageContainerRight: {
        alignItems: 'flex-end',
    },
    messageBubble: {
        maxWidth: '75%',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        padding: 12,
    },
    messageBubbleRight: {
        backgroundColor: '#1e40af',
    },
    messageBubbleInternal: {
        backgroundColor: '#fef3c7',
        borderWidth: 2,
        borderColor: '#fbbf24',
    },
    internalLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#92400e',
        marginBottom: 4,
    },
    messageSender: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 14,
        color: '#1e293b',
        lineHeight: 20,
    },
    messageTextRight: {
        color: '#ffffff',
    },
    messageTextInternal: {
        color: '#78350f',
    },
    messageDate: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 4,
    },
    messageDateRight: {
        color: '#bfdbfe',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    messageInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1e293b',
        maxHeight: 100,
        marginRight: 8,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1e40af',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    emptyChatContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyChatText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748b',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    modalCloseButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        flex: 1,
    },
    modalContentInner: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 20,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 8,
    },
    formInput: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1e293b',
    },
    formTextArea: {
        minHeight: 120,
        textAlignVertical: 'top',
    },
    priorityButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    priorityButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        backgroundColor: '#ffffff',
        alignItems: 'center',
    },
    priorityButtonSelected: {
        backgroundColor: '#1e40af',
        borderColor: '#1e40af',
    },
    priorityButtonText: {
        fontSize: 14,
        color: '#64748b',
        textTransform: 'capitalize',
    },
    priorityButtonTextSelected: {
        color: '#ffffff',
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        backgroundColor: '#ffffff',
        alignItems: 'center',
    },
    modalCancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#475569',
    },
    modalSubmitButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#1e40af',
        alignItems: 'center',
    },
    modalSubmitButtonDisabled: {
        opacity: 0.5,
    },
    modalSubmitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    pickerModal: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    pickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    pickerOptionSelected: {
        backgroundColor: '#eff6ff',
    },
    pickerOptionText: {
        fontSize: 16,
        color: '#1e293b',
        textTransform: 'capitalize',
    },
    pickerOptionTextSelected: {
        color: '#1e40af',
        fontWeight: '600',
    },
    pickerCancelButton: {
        marginTop: 8,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    pickerCancelText: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        fontWeight: '600',
    },
});

