import { supabase } from './supabase';
import { NetworkStatusMonitor } from './offline/networkStatus';
import { LocalDatabaseService } from './offline/localDatabase';
import { SyncQueueService, SyncPriority } from './offline/syncQueue';
import { DataType } from './offline/conflictResolution';

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
  ): Promise<{ isOpen?: boolean; error?: string; fromCache?: boolean }> {
    try {
      // Try to fetch from server if online
      if (NetworkStatusMonitor.isOnline()) {
        try {
          const { data, error } = await supabase
            .from('event_chat_settings')
            .select('is_chat_open')
            .eq('event_id', eventId)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            // Fall through to cache
          } else if (data !== null) {
            // Save to local database
            await LocalDatabaseService.saveChatSettings({
              event_id: eventId,
              is_chat_open: data.is_chat_open,
            });
            return { isOpen: data.is_chat_open, fromCache: false };
          }
        } catch (error) {
          console.error('Network error, falling back to cache:', error);
          // Fall through to cache
        }
      }

      // Fallback to local database
      const cachedSettings = await LocalDatabaseService.getChatSettings(eventId);
      return { isOpen: cachedSettings?.is_chat_open ?? true, fromCache: true };
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
  ): Promise<{ messages?: EventMessage[]; error?: string; fromCache?: boolean }> {
    try {
      // Try to fetch from server if online
      if (NetworkStatusMonitor.isOnline()) {
        try {
          // Get event to find organizer
          const { data: event, error: eventError } = await supabase
            .from('events')
            .select('created_by')
            .eq('id', eventId)
            .single();

          if (eventError || !event) {
            // Fall through to cache
          } else {
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
              // Fall through to cache
            } else if (data) {
              // Fetch sender info and event info for each message
              const messagesWithSenders = await Promise.all(
                (data || []).map(async (msg) => {
                  const [senderResult, eventResult] = await Promise.all([
                    supabase.rpc('get_user_profile', { user_id: msg.sender_id }),
                    supabase.from('events').select('id, title').eq('id', msg.event_id).single()
                  ]);

                  const messageData = {
                    ...msg,
                    sender: senderResult.data || null,
                    event: eventResult.data || null
                  };

                  // Save to local database
                  await LocalDatabaseService.saveEventMessage(messageData);
                  return messageData;
                })
              );

              return { messages: messagesWithSenders, fromCache: false };
            }
          }
        } catch (error) {
          console.error('Network error, falling back to cache:', error);
          // Fall through to cache
        }
      }

      // Fallback to local database
      const cachedMessages = await LocalDatabaseService.getEventMessages(eventId, userId);
      return { messages: cachedMessages, fromCache: true };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Send a message
   * Supports offline queueing
   */
  static async sendMessage(
    eventId: string,
    senderId: string,
    message: string
  ): Promise<{ message?: EventMessage; error?: string; queued?: boolean }> {
    try {
      // Get event to find organizer
      const eventResult = await supabase
        .from('events')
        .select('created_by')
        .eq('id', eventId)
        .single();

      if (eventResult.error || !eventResult.data) {
        return { error: 'Event not found' };
      }

      const organizerId = eventResult.data.created_by;
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
      if (isOrganizer) {
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

      // If offline, queue message and save locally
      if (!NetworkStatusMonitor.isOnline()) {
        const messageId = `local-msg-${Date.now()}-${Math.random()}`;
        const messageData = {
          id: messageId,
          event_id: eventId,
          participant_id: participantId,
          organizer_id: organizerId,
          sender_id: senderId,
          message: message.trim(),
          read_at: null,
          created_at: new Date().toISOString(),
        };

        // Save to local database
        await LocalDatabaseService.saveEventMessage(messageData);

        // Queue for sync (last write wins for messages)
        await SyncQueueService.enqueue(
          DataType.SURVEY_RESPONSE, // Using survey response type (last write wins) for messages
          'create',
          'event_messages',
          messageData,
          SyncPriority.HIGH
        );

        // Send notification that message is queued
        try {
          const { NotificationService } = await import('./notificationService');
          const { EventService } = await import('./eventService');
          const eventResult = await EventService.getEventById(eventId);

          await NotificationService.createNotification(
            senderId,
            'Message Queued',
            `Your message about "${eventResult.event?.title || 'the event'}" has been saved offline and will be sent when online.`,
            'info',
            {
              action_url: `/event-messages?eventId=${eventId}`,
              action_text: 'View Messages',
              priority: 'low'
            }
          );
        } catch (err) {
          console.error('Failed to create message queued notification:', err);
        }

        return { message: messageData as EventMessage, queued: true };
      }

      // Online: Send immediately
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
        try {
          const { NotificationService } = await import('./notificationService');
          const senderName = senderData.first_name && senderData.last_name
            ? `${senderData.first_name} ${senderData.last_name}`
            : senderData.email || 'Someone';

          const notificationTitle = isOrganizer
            ? 'New Message from Organizer'
            : 'New Message from Participant';

          const notificationMessage = `${senderName} sent you a message about "${eventData?.title || 'the event'}".`;

          await NotificationService.createNotification(
            recipientId,
            notificationTitle,
            notificationMessage,
            'info',
            {
              action_url: `/event-messages?eventId=${eventId}`,
              action_text: 'View Message',
              priority: 'normal'
            }
          );
        } catch (err) {
          console.error('Failed to create notification:', err);
        }
      }

      const messageWithSender = {
        ...data,
        sender: senderData || null
      };

      // Save to local database
      await LocalDatabaseService.saveEventMessage(messageWithSender);

      return { message: messageWithSender as EventMessage, queued: false };
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
      // Only mark as read if online
      if (!NetworkStatusMonitor.isOnline()) {
        // Queue for later
        return {};
      }

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
   * Get unread message count for participant
   */
  static async getUnreadCount(
    userId: string,
    eventId?: string
  ): Promise<{ count?: number; error?: string }> {
    try {
      // Only count if online (unread is server-side)
      if (!NetworkStatusMonitor.isOnline()) {
        return { count: 0 };
      }

      let query = supabase
        .from('event_messages')
        .select('*', { count: 'exact', head: true })
        .eq('participant_id', userId)
        .neq('sender_id', userId)
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
}
