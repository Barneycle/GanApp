import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export class PushNotificationService {
  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get the push notification token
   */
  static async getPushToken(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permissions not granted');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'da180b51-7dea-4e92-8673-e9f2345ae9b7', // From app.json
      });

      return tokenData.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register push token with Supabase
   */
  static async registerPushToken(userId: string, token: string): Promise<{ error?: string }> {
    try {
      // Store token in a user_push_tokens table (you'll need to create this)
      // For now, we'll store it in user metadata or a separate table
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          push_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform'
        });

      if (error) {
        // If table doesn't exist, store in user metadata as fallback
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { push_token: token }
        });
        
        if (metadataError) {
          return { error: metadataError.message };
        }
      }

      return {};
    } catch (error: any) {
      return { error: 'Failed to register push token' };
    }
  }

  /**
   * Send a local notification (for testing or immediate display)
   */
  static async sendLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      // Check permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permissions not granted, cannot send notification');
        throw new Error('Notification permissions not granted');
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          badge: 1,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
      throw error;
    }
  }

  /**
   * Set up notification listeners
   */
  static setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationTapped: (response: Notifications.NotificationResponse) => void
  ): () => void {
    // Listener for notifications received while app is in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );

    // Listener for when user taps on a notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      onNotificationTapped
    );

    // Return cleanup function
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get notification badge count
   */
  static async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set notification badge count
   */
  static async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

