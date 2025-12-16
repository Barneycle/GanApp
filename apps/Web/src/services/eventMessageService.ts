import { supabase } from '../lib/supabaseClient';
import { NotificationService } from './notificationService';

export interface EventMessage {
  id: string;
  event_id: string;
  participant_id: string;
  organizer_id: string;
  message: string;
  sender_id: string;
  read_at: string | null;
  created_at: string;
  sender?: any;
  event?: any;
}

export class EventMessageService {
  /**
   * Get chat settings for an event
   */
  static async getChatSettings(
    eventId: string
  ): Promise<{ isOpen?: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_chat_settings')
        .select('is_chat_open')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        return { error: error.message };
      }

      // Default to open if no settings exist
      return { isOpen: data?.is_chat_open ?? true };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update chat settings (open/close chat) - organizer only
   */
  static async updateChatSettings(
    eventId: string,
    organizerId: string,
    isOpen: boolean
  ): Promise<{ error?: string }> {
    try {
      // Verify organizer is the event creator
      const { data: event } = await supabase
        .from('events')
        .select('created_by')
        .eq('id', eventId)
        .single();

      if (!event || event.created_by !== organizerId) {
        return { error: 'Only the event organizer can update chat settings' };
      }

      // Upsert chat settings
      const { error } = await supabase
        .from('event_chat_settings')
        .upsert({
          event_id: eventId,
          is_chat_open: isOpen,
          updated_by: organizerId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'event_id'
        });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get or create conversation thread for an event (get all messages)
   */
  static async getEventMessages(
    eventId: string,
    userId: string
  ): Promise<{ messages?: EventMessage[]; error?: string }> {
    try {
      // Get event to find organizer
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('created_by')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return { error: 'Event not found' };
      }

      const organizerId = event.created_by;
      const isOrganizer = userId === organizerId;

      // Get all messages for this event and user
      const { data, error } = await supabase
        .from('event_messages')
        .select('*')
        .eq('event_id', eventId)
        .eq(isOrganizer ? 'organizer_id' : 'participant_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        return { error: error.message };
      }

      // Fetch sender info and event info for each message
      const messagesWithSenders = await Promise.all(
        (data || []).map(async (msg) => {
          const [senderResult, eventResult] = await Promise.all([
            supabase.rpc('get_user_profile', { user_id: msg.sender_id }),
            supabase.from('events').select('id, title').eq('id', msg.event_id).single()
          ]);

          return {
            ...msg,
            sender: senderResult.data || null,
            event: eventResult.data || null
          };
        })
      );

      return { messages: messagesWithSenders };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Send a message
   */
  static async sendMessage(
    eventId: string,
    senderId: string,
    message: string
  ): Promise<{ message?: EventMessage; error?: string }> {
    try {
      // Get event to find organizer
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('created_by')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return { error: 'Event not found' };
      }

      const organizerId = event.created_by;
      const isOrganizer = senderId === organizerId;

      // For participants, check if chat is open
      if (!isOrganizer) {
        const chatSettings = await this.getChatSettings(eventId);
        if (chatSettings.error) {
          return { error: chatSettings.error };
        }
        if (!chatSettings.isOpen) {
          return { error: 'The chat for this event is currently closed by the organizer. Please contact them through other means.' };
        }

        const { data: registration } = await supabase
          .from('event_registrations')
          .select('user_id')
          .eq('event_id', eventId)
          .eq('user_id', senderId)
          .eq('status', 'registered')
          .maybeSingle();

        if (!registration) {
          return { error: 'You must be registered for this event to contact the organizer' };
        }
      }

      // For participants, we need to ensure they're registered and get participant_id
      let participantId = senderId;
      if (!isOrganizer) {
        participantId = senderId;
      } else {
        // For organizer replies, we need to find the participant_id from existing messages
        const { data: existingMessage } = await supabase
          .from('event_messages')
          .select('participant_id')
          .eq('event_id', eventId)
          .neq('sender_id', organizerId)
          .limit(1)
          .maybeSingle();

        if (!existingMessage) {
          return { error: 'No conversation found. Participant must send the first message.' };
        }
        participantId = existingMessage.participant_id;
      }

      const { data, error } = await supabase
        .from('event_messages')
        .insert({
          event_id: eventId,
          participant_id: participantId,
          organizer_id: organizerId,
          sender_id: senderId,
          message: message.trim()
        })
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      // Fetch sender info
      const { data: senderData } = await supabase.rpc('get_user_profile', {
        user_id: senderId
      });

      // Get event title for notification
      const { data: eventData } = await supabase
        .from('events')
        .select('title')
        .eq('id', eventId)
        .single();

      // Determine recipient and send notification
      const recipientId = isOrganizer ? participantId : organizerId;

      // Create notification for the recipient
      if (recipientId && senderData) {
        const senderName = senderData.first_name && senderData.last_name
          ? `${senderData.first_name} ${senderData.last_name}`
          : senderData.email || 'Someone';

        const notificationTitle = isOrganizer
          ? 'New Message from Organizer'
          : 'New Message from Participant';

        const notificationMessage = isOrganizer
          ? `${senderName} sent you a message about "${eventData?.title || 'the event'}".`
          : `${senderName} sent you a message about "${eventData?.title || 'the event'}".`;

        // Use queued notification system
        NotificationService.createNotification(
          recipientId,
          notificationTitle,
          notificationMessage,
          'info',
          {
            action_url: `/events?eventId=${eventId}&openChat=true`,
            action_text: 'View Message',
            priority: 'normal',
            immediate: false // Use queued system for better performance
          }
        ).catch(err => console.error('Failed to create notification:', err));
      }

      return {
        message: {
          ...data,
          sender: senderData || null
        }
      };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Mark messages as read (for organizer)
   */
  static async markMessagesAsRead(
    eventId: string,
    organizerId: string
  ): Promise<{ error?: string }> {
    try {
      // Verify user is the organizer
      const { data: event } = await supabase
        .from('events')
        .select('created_by')
        .eq('id', eventId)
        .single();

      if (!event || event.created_by !== organizerId) {
        return { error: 'Only the event organizer can mark messages as read' };
      }

      // Mark all unread messages from participants as read
      const { error: updateError } = await supabase
        .from('event_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('event_id', eventId)
        .eq('organizer_id', organizerId)
        .neq('sender_id', organizerId)
        .is('read_at', null);

      if (updateError) {
        return { error: updateError.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get unread message count for organizer (all events or specific event)
   */
  static async getUnreadCount(
    organizerId: string,
    eventId?: string
  ): Promise<{ count?: number; error?: string }> {
    try {
      let query = supabase
        .from('event_messages')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', organizerId)
        .neq('sender_id', organizerId)
        .is('read_at', null);

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { count, error } = await query;

      if (error) {
        return { error: error.message };
      }

      return { count: count || 0 };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get all conversations for an organizer (grouped by event and participant)
   */
  static async getOrganizerConversations(
    organizerId: string
  ): Promise<{ conversations?: any[]; error?: string }> {
    try {
      // Get all messages for this organizer
      const { data: allMessages, error } = await supabase
        .from('event_messages')
        .select(`
          event_id,
          participant_id,
          events!inner(id, title, created_by)
        `)
        .eq('organizer_id', organizerId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      // Group by event_id and participant_id
      const conversationMap = new Map();
      (allMessages || []).forEach((msg) => {
        const key = `${msg.event_id}_${msg.participant_id}`;
        if (!conversationMap.has(key)) {
          conversationMap.set(key, {
            event_id: msg.event_id,
            participant_id: msg.participant_id,
            event: msg.events
          });
        }
      });

      // Get details for each conversation
      const conversations = await Promise.all(
        Array.from(conversationMap.values()).map(async (conv) => {
          const [unreadResult, participantResult, lastMessageResult] = await Promise.all([
            this.getUnreadCount(organizerId, conv.event_id),
            supabase.rpc('get_user_profile', { user_id: conv.participant_id }),
            supabase
              .from('event_messages')
              .select('message, created_at')
              .eq('event_id', conv.event_id)
              .eq('participant_id', conv.participant_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          ]);

          return {
            event_id: conv.event_id,
            participant_id: conv.participant_id,
            event: conv.event,
            participant: participantResult.data || null,
            unread_count: unreadResult.count || 0,
            last_message: lastMessageResult.data || null,
            last_message_at: lastMessageResult.data?.created_at || null
          };
        })
      );

      // Filter out conversations with no messages (deleted conversations)
      const conversationsWithMessages = conversations.filter(conv => conv.last_message !== null);

      // Sort by last message time
      conversationsWithMessages.sort((a, b) => {
        const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return timeB - timeA;
      });

      return { conversations: conversationsWithMessages };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Delete all messages in a conversation (organizer or participant)
   */
  static async deleteAllMessages(
    eventId: string,
    userId: string,
    participantId?: string
  ): Promise<{ error?: string }> {
    try {
      // Get event to find organizer
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('created_by')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return { error: 'Event not found' };
      }

      const organizerId = event.created_by;
      const isOrganizer = userId === organizerId;

      // Build query based on role
      // Always filter by event_id first
      let query = supabase
        .from('event_messages')
        .delete()
        .eq('event_id', eventId)
        .select(); // Select deleted rows to get count

      if (isOrganizer) {
        // Organizer can delete all messages for a specific participant conversation
        if (participantId) {
          // Delete all messages in the conversation thread (both from organizer and participant)
          query = query.eq('participant_id', participantId);
        } else {
          // If no participantId specified, delete all messages where organizer is involved
          query = query.eq('organizer_id', organizerId);
        }
      } else {
        // Participant can delete all messages in their conversation thread
        // (both their own messages and organizer's messages to them)
        query = query.eq('participant_id', userId);
      }

      const { data, error: deleteError } = await query;

      if (deleteError) {
        console.error('Delete messages error:', deleteError);
        console.error('Delete error details:', {
          eventId,
          userId,
          participantId,
          isOrganizer,
          organizerId
        });
        return { error: deleteError.message || 'Failed to delete messages. Please check RLS policies.' };
      }

      // Log deletion result for debugging
      const deletedCount = data?.length || 0;
      console.log(`Successfully deleted ${deletedCount} message(s) from conversation`, {
        eventId,
        participantId,
        isOrganizer
      });

      if (deletedCount === 0) {
        console.warn('No messages were deleted. This might indicate an RLS policy issue or no matching messages.');
      }

      // Return success even if no rows were deleted (already empty)
      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}
