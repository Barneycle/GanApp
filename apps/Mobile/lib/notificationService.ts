import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  read: boolean;
  action_url?: string;
  action_text?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expires_at?: string;
  created_at: string;
}

export class NotificationService {
  /**
   * Get all notifications for a user
   */
  static async getNotifications(userId: string): Promise<{ notifications?: Notification[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        return { error: error.message };
      }

      // Filter out expired notifications
      const now = new Date();
      const validNotifications = (data || []).filter(notification => {
        if (!notification.expires_at) return true;
        return new Date(notification.expires_at) > now;
      });

      return { notifications: validNotifications };
    } catch (error: any) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get unread notifications count
   */
  static async getUnreadCount(userId: string): Promise<{ count?: number; error?: string }> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        return { error: error.message };
      }

      return { count: count || 0 };
    } catch (error: any) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error: any) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error: any) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<{ error?: string }> {
    try {
      const { error, data } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .select();

      if (error) {
        console.error('Delete notification error:', error);
        return { error: error.message };
      }

      // Check if any rows were actually deleted
      if (!data || data.length === 0) {
        return { error: 'Notification not found or you do not have permission to delete it' };
      }

      return {};
    } catch (error: any) {
      console.error('Delete notification exception:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Delete all read notifications
   */
  static async deleteAllRead(userId: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('read', true);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error: any) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Delete all notifications for a user
   */
  static async deleteAllNotifications(userId: string): Promise<{ error?: string }> {
    try {
      const { error, data } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Delete all notifications error:', error);
        return { error: error.message };
      }

      return {};
    } catch (error: any) {
      console.error('Delete all notifications exception:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Create a notification (typically called by backend/triggers)
   */
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'success' | 'warning' | 'error' | 'info' = 'info',
    options?: {
      action_url?: string;
      action_text?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      expires_at?: string;
    }
  ): Promise<{ notification?: Notification; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title,
          message,
          type,
          action_url: options?.action_url,
          action_text: options?.action_text,
          priority: options?.priority || 'normal',
          expires_at: options?.expires_at,
        }])
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { notification: data };
    } catch (error: any) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Create registration confirmation notification
   */
  static async createRegistrationNotification(
    userId: string,
    eventTitle: string,
    eventId: string
  ): Promise<{ notification?: Notification; error?: string }> {
    return this.createNotification(
      userId,
      'Registration Confirmed!',
      `You have successfully registered for "${eventTitle}". We'll send you reminders before the event.`,
      'success',
      {
        action_url: `/event-details?eventId=${eventId}`,
        action_text: 'View Event',
        priority: 'normal',
      }
    );
  }

  /**
   * Create event reminder notification
   */
  static async createEventReminderNotification(
    userId: string,
    eventTitle: string,
    eventDate: string,
    eventId: string
  ): Promise<{ notification?: Notification; error?: string }> {
    const eventDateObj = new Date(eventDate);
    const formattedDate = eventDateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    return this.createNotification(
      userId,
      'Event Reminder',
      `Don't forget! "${eventTitle}" is happening on ${formattedDate}.`,
      'info',
      {
        action_url: `/event-details?eventId=${eventId}`,
        action_text: 'View Event',
        priority: 'high',
      }
    );
  }

  /**
   * Create survey availability notification
   */
  static async createSurveyNotification(
    userId: string,
    eventTitle: string,
    surveyId: string,
    eventId: string
  ): Promise<{ notification?: Notification; error?: string }> {
    return this.createNotification(
      userId,
      'Survey Available',
      `A survey is now available for "${eventTitle}". Please share your feedback!`,
      'info',
      {
        action_url: `/evaluation?id=${surveyId}`,
        action_text: 'Take Evaluation',
        priority: 'normal',
      }
    );
  }


  /**
   * Create certificate ready notification
   */
  static async createCertificateNotification(
    userId: string,
    eventTitle: string,
    eventId: string
  ): Promise<{ notification?: Notification; error?: string }> {
    return this.createNotification(
      userId,
      'Certificate Ready!',
      `Your certificate for "${eventTitle}" is now available for download.`,
      'success',
      {
        action_url: `/certificate?eventId=${eventId}`,
        action_text: 'View Certificate',
        priority: 'normal',
      }
    );
  }

  /**
   * Subscribe to real-time notifications
   */
  static subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void
  ): () => void {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const notification = payload.new as Notification;
          onNotification(notification);

          // Send push notification when new notification is created
          try {
            const { PushNotificationService } = await import('./pushNotificationService');
            await PushNotificationService.sendLocalNotification(
              notification.title,
              notification.message,
              {
                notificationId: notification.id,
                actionUrl: notification.action_url,
                type: notification.type,
              }
            );
          } catch (err) {
            // Push notification failure shouldn't break the flow
            console.error('Failed to send push notification:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

