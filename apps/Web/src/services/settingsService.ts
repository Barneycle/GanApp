import { supabase } from '../lib/supabaseClient';

export interface NotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  event_reminders: boolean;
  survey_notifications: boolean;
  created_at?: string;
  updated_at?: string;
}

export class SettingsService {
  /**
   * Get notification preferences for a user
   */
  static async getNotificationPreferences(userId: string): Promise<{ preferences?: NotificationPreferences; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no preferences exist, return defaults
        if (error.code === 'PGRST116') {
          return {
            preferences: {
              user_id: userId,
              email_notifications: true,
              push_notifications: true,
              event_reminders: true,
              survey_notifications: true,
            }
          };
        }
        return { error: error.message };
      }

      return { preferences: data };
    } catch (error: any) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<{ preferences?: NotificationPreferences; error?: string }> {
    try {
      // Check if preferences exist
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update existing preferences
        const { data, error } = await supabase
          .from('notification_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          return { error: error.message };
        }

        return { preferences: data };
      } else {
        // Insert new preferences
        const { data, error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: userId,
            email_notifications: preferences.email_notifications ?? true,
            push_notifications: preferences.push_notifications ?? true,
            event_reminders: preferences.event_reminders ?? true,
            survey_notifications: preferences.survey_notifications ?? true,
          })
          .select()
          .single();

        if (error) {
          return { error: error.message };
        }

        return { preferences: data };
      }
    } catch (error: any) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Delete account (soft delete by archiving)
   */
  static async deleteAccount(userId: string, reason: string): Promise<{ error?: string; success?: boolean }> {
    try {
      // This would typically call a backend function to archive the user
      // For now, we'll just mark the user as inactive
      const { error } = await supabase.auth.updateUser({
        data: {
          is_active: false,
          deletion_reason: reason,
        }
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { error: 'An unexpected error occurred' };
    }
  }
}

