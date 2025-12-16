import { supabase } from '../lib/supabaseClient';

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
   * Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
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
  static async deleteAll(userId: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error: any) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Create a notification (queued for background processing)
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
      immediate?: boolean; // If true, insert immediately instead of queuing
    }
  ): Promise<{ notification?: Notification; queued?: boolean; jobId?: string; error?: string }> {
    try {
      // If immediate flag is set, insert directly (for backward compatibility)
      if (options?.immediate) {
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
      }

      // Otherwise, queue the notification
      const { JobQueueService } = await import('./jobQueueService');
      const { NotificationJobProcessor } = await import('./notificationJobProcessor');

      // Get current user ID if available
      const { data: { user } } = await supabase.auth.getUser();
      const createdBy = user?.id;

      const jobResult = await JobQueueService.queueSingleNotification(
        {
          userId,
          title,
          message,
          type,
          options,
          createdBy
        },
        createdBy,
        options?.priority === 'urgent' ? 1 : options?.priority === 'high' ? 3 : 5
      );

      if (jobResult.error || !jobResult.job) {
        return { error: jobResult.error || 'Failed to queue notification' };
      }

      // Trigger immediate processing
      NotificationJobProcessor.processPendingJobs().catch(err =>
        console.error('Failed to process notification jobs:', err)
      );

      return { queued: true, jobId: jobResult.job.id };
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' };
    }
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
        (payload) => {
          const notification = payload.new as Notification;
          onNotification(notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

