import { supabase } from './supabase';

export interface SupportTicket {
    id: string;
    user_id: string;
    subject: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    category?: string;
    created_at: string;
    updated_at: string;
    resolved_at?: string;
    resolved_by?: string;
    user?: {
        id: string;
        email: string;
        first_name?: string;
        last_name?: string;
        role: string;
    };
    message_count?: number;
    last_message_at?: string;
}

export interface SupportMessage {
    id: string;
    ticket_id: string;
    sender_id: string;
    message: string;
    attachments?: any[];
    is_internal: boolean;
    created_at: string;
    read_at?: string;
    sender?: {
        id: string;
        email: string;
        first_name?: string;
        last_name?: string;
        role: string;
    };
}

export class SupportService {
    /**
     * Create a new support ticket
     */
    static async createTicket(
        subject: string,
        message: string,
        category?: string,
        priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
    ): Promise<{ ticket?: SupportTicket; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { error: 'Not authenticated' };
            }

            // Create ticket
            const { data: ticket, error: ticketError } = await supabase
                .from('support_tickets')
                .insert({
                    user_id: user.id,
                    subject,
                    category,
                    priority,
                    status: 'open'
                })
                .select()
                .single();

            if (ticketError) {
                return { error: ticketError.message };
            }

            // Create first message
            const { error: messageError } = await supabase
                .from('support_messages')
                .insert({
                    ticket_id: ticket.id,
                    sender_id: user.id,
                    message
                });

            if (messageError) {
                // Rollback ticket creation
                await supabase.from('support_tickets').delete().eq('id', ticket.id);
                return { error: messageError.message };
            }

            return { ticket };
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Failed to create ticket' };
        }
    }

    /**
     * Get user's tickets
     */
    static async getUserTickets(): Promise<{ tickets?: SupportTicket[]; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { error: 'Not authenticated' };
            }

            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                return { error: error.message };
            }

            // Get message counts and last message times
            const ticketsWithStats = await Promise.all(
                (data || []).map(async (ticket) => {
                    const { data: messages } = await supabase
                        .from('support_messages')
                        .select('created_at')
                        .eq('ticket_id', ticket.id)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    const { count } = await supabase
                        .from('support_messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('ticket_id', ticket.id);

                    return {
                        ...ticket,
                        message_count: count || 0,
                        last_message_at: messages?.[0]?.created_at
                    };
                })
            );

            return { tickets: ticketsWithStats };
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Failed to load tickets' };
        }
    }

    /**
     * Get all tickets (admin only)
     */
    static async getAllTickets(
        status?: string,
        priority?: string
    ): Promise<{ tickets?: SupportTicket[]; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { error: 'Not authenticated' };
            }

            // Check if user is admin using auth metadata
            const userRole = user.user_metadata?.role || 'participant';
            if (userRole !== 'admin') {
                return { error: 'Unauthorized' };
            }

            let query = supabase
                .from('support_tickets')
                .select('*')
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            if (priority) {
                query = query.eq('priority', priority);
            }

            const { data, error } = await query;

            if (error) {
                return { error: error.message };
            }

            // Get message counts, last message times, and user info
            const ticketsWithStats = await Promise.all(
                (data || []).map(async (ticket: any) => {
                    const { data: messages } = await supabase
                        .from('support_messages')
                        .select('created_at')
                        .eq('ticket_id', ticket.id)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    const { count } = await supabase
                        .from('support_messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('ticket_id', ticket.id);

                    // Fetch user info using RPC function
                    let userInfo = null;
                    try {
                        const { data: userData } = await supabase.rpc('get_user_profile', { user_id: ticket.user_id });
                        if (userData) {
                            userInfo = {
                                id: userData.id,
                                email: userData.email || '',
                                first_name: userData.first_name || '',
                                last_name: userData.last_name || '',
                                role: userData.role || 'participant'
                            };
                        }
                    } catch (error) {
                        console.error('Error fetching user profile:', error);
                    }

                    return {
                        ...ticket,
                        message_count: count || 0,
                        last_message_at: messages?.[0]?.created_at,
                        user: userInfo
                    };
                })
            );

            return { tickets: ticketsWithStats };
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Failed to load tickets' };
        }
    }

    /**
     * Get ticket by ID with messages
     */
    static async getTicketById(ticketId: string): Promise<{ ticket?: SupportTicket; messages?: SupportMessage[]; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { error: 'Not authenticated' };
            }

            // Get ticket
            const { data: ticket, error: ticketError } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('id', ticketId)
                .single();

            if (ticketError) {
                return { error: ticketError.message };
            }

            // Check permissions using auth metadata
            const userRole = user.user_metadata?.role || 'participant';
            if (ticket.user_id !== user.id && userRole !== 'admin') {
                return { error: 'Unauthorized' };
            }

            // Get messages
            const { data: messages, error: messagesError } = await supabase
                .from('support_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (messagesError) {
                return { error: messagesError.message };
            }

            // Fetch user info for ticket owner
            let ticketUserInfo = null;
            try {
                const { data: userData } = await supabase.rpc('get_user_profile', { user_id: ticket.user_id });
                if (userData) {
                    ticketUserInfo = {
                        id: userData.id,
                        email: userData.email || '',
                        first_name: userData.first_name || '',
                        last_name: userData.last_name || '',
                        role: userData.role || 'participant'
                    };
                }
            } catch (error) {
                console.error('Error fetching ticket user profile:', error);
            }

            // Enrich messages with sender info
            const enrichedMessages = await Promise.all(
                (messages || []).map(async (msg: any) => {
                    let senderInfo = null;
                    try {
                        const { data: senderData } = await supabase.rpc('get_user_profile', { user_id: msg.sender_id });
                        if (senderData) {
                            senderInfo = {
                                id: senderData.id,
                                email: senderData.email || '',
                                first_name: senderData.first_name || '',
                                last_name: senderData.last_name || '',
                                role: senderData.role || 'participant'
                            };
                        }
                    } catch (error) {
                        console.error('Error fetching sender profile:', error);
                    }

                    return {
                        ...msg,
                        sender: senderInfo
                    };
                })
            );

            // Filter out internal messages for non-admins
            const filteredMessages = userRole === 'admin'
                ? enrichedMessages
                : enrichedMessages?.filter((msg: any) => !msg.is_internal);

            return {
                ticket: {
                    ...ticket,
                    user: ticketUserInfo
                },
                messages: filteredMessages
            };
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Failed to load ticket' };
        }
    }

    /**
     * Add message to ticket
     */
    static async addMessage(
        ticketId: string,
        message: string,
        attachments?: any[],
        isInternal: boolean = false
    ): Promise<{ message?: SupportMessage; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { error: 'Not authenticated' };
            }

            // Verify ticket access
            const { data: ticket } = await supabase
                .from('support_tickets')
                .select('user_id')
                .eq('id', ticketId)
                .single();

            if (!ticket) {
                return { error: 'Ticket not found' };
            }

            // Check permissions using auth metadata
            const userRole = user.user_metadata?.role || 'participant';
            if (ticket.user_id !== user.id && userRole !== 'admin') {
                return { error: 'Unauthorized' };
            }

            // Only admins can create internal messages
            if (isInternal && userRole !== 'admin') {
                return { error: 'Only admins can create internal messages' };
            }

            const { data: newMessage, error: messageError } = await supabase
                .from('support_messages')
                .insert({
                    ticket_id: ticketId,
                    sender_id: user.id,
                    message,
                    attachments,
                    is_internal: isInternal
                })
                .select('*')
                .single();

            if (messageError) {
                return { error: messageError.message };
            }

            // Fetch sender info
            let senderInfo = null;
            try {
                const { data: senderData } = await supabase.rpc('get_user_profile', { user_id: user.id });
                if (senderData) {
                    senderInfo = {
                        id: senderData.id,
                        email: senderData.email || '',
                        first_name: senderData.first_name || '',
                        last_name: senderData.last_name || '',
                        role: senderData.role || 'participant'
                    };
                }
            } catch (error) {
                console.error('Error fetching sender profile:', error);
            }

            return {
                message: {
                    ...newMessage,
                    sender: senderInfo
                }
            };
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Failed to send message' };
        }
    }

    /**
     * Update ticket status
     */
    static async updateTicketStatus(
        ticketId: string,
        status: 'open' | 'in_progress' | 'resolved' | 'closed'
    ): Promise<{ ticket?: SupportTicket; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { error: 'Not authenticated' };
            }

            // Check if user is admin using auth metadata
            const userRole = user.user_metadata?.role || 'participant';
            if (userRole !== 'admin') {
                return { error: 'Unauthorized' };
            }

            const updateData: any = { status };
            if (status === 'resolved') {
                updateData.resolved_at = new Date().toISOString();
                updateData.resolved_by = user.id;
            }

            const { data, error } = await supabase
                .from('support_tickets')
                .update(updateData)
                .eq('id', ticketId)
                .select()
                .single();

            if (error) {
                return { error: error.message };
            }

            return { ticket: data };
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Failed to update ticket' };
        }
    }

    /**
     * Mark messages as read
     */
    static async markMessagesAsRead(ticketId: string): Promise<{ success?: boolean; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { error: 'Not authenticated' };
            }

            const { error } = await supabase
                .from('support_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('ticket_id', ticketId)
                .neq('sender_id', user.id)
                .is('read_at', null);

            if (error) {
                return { error: error.message };
            }

            return { success: true };
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Failed to mark messages as read' };
        }
    }
}

