import { supabase } from '../lib/supabaseClient';

export interface SystemSettings {
  maintenance_mode: boolean;
  registration_enabled: boolean;
  event_creation_enabled: boolean;
  survey_creation_enabled: boolean;
  email_notifications_enabled: boolean;
  max_events_per_user: number;
  max_participants_per_event: number;
}

export class SystemSettingsService {
  /**
   * Get all system settings
   */
  static async getSystemSettings(): Promise<{ settings?: SystemSettings; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .order('setting_key');

      if (error) {
        // If table doesn't exist, return defaults
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          return {
            settings: {
              maintenance_mode: false,
              registration_enabled: true,
              event_creation_enabled: true,
              survey_creation_enabled: true,
              email_notifications_enabled: true,
              max_events_per_user: 10,
              max_participants_per_event: 1000,
            }
          };
        }
        return { error: error.message };
      }

      // Convert array of {setting_key, setting_value} to object
      const settings: SystemSettings = {
        maintenance_mode: false,
        registration_enabled: true,
        event_creation_enabled: true,
        survey_creation_enabled: true,
        email_notifications_enabled: true,
        max_events_per_user: 10,
        max_participants_per_event: 1000,
      };

      if (data) {
        data.forEach((item) => {
          const key = item.setting_key as keyof SystemSettings;
          const value = item.setting_value;
          
          if (key === 'maintenance_mode' || 
              key === 'registration_enabled' || 
              key === 'event_creation_enabled' || 
              key === 'survey_creation_enabled' || 
              key === 'email_notifications_enabled') {
            settings[key] = value === true || value === 'true' || (typeof value === 'string' && value.toLowerCase() === 'true');
          } else if (key === 'max_events_per_user' || key === 'max_participants_per_event') {
            settings[key] = typeof value === 'number' ? value : parseInt(String(value), 10) || 0;
          }
        });
      }

      return { settings };
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' };
    }
  }

  /**
   * Update system settings
   */
  static async updateSystemSettings(
    settings: Partial<SystemSettings>,
    userId: string
  ): Promise<{ success?: boolean; error?: string }> {
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }));

      // Use upsert to update or insert settings
      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, {
          onConflict: 'setting_key',
          ignoreDuplicates: false,
        });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' };
    }
  }

  /**
   * Get a single system setting by key
   */
  static async getSystemSetting(key: keyof SystemSettings): Promise<{ value?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Setting doesn't exist, return default
          return { value: this.getDefaultValue(key) };
        }
        return { error: error.message };
      }

      return { value: data?.setting_value };
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' };
    }
  }

  /**
   * Get default value for a setting
   */
  private static getDefaultValue(key: keyof SystemSettings): any {
    const defaults: SystemSettings = {
      maintenance_mode: false,
      registration_enabled: true,
      event_creation_enabled: true,
      survey_creation_enabled: true,
      email_notifications_enabled: true,
      max_events_per_user: 10,
      max_participants_per_event: 1000,
    };
    return defaults[key];
  }
}

