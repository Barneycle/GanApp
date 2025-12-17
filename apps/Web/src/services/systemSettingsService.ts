import { supabase } from '../lib/supabaseClient';

export interface SystemSettings {
  maintenance_mode: boolean;
}

export class SystemSettingsService {
  /**
   * Get maintenance mode status (works for unauthenticated users)
   */
  static async getMaintenanceMode(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('get_maintenance_mode');
      if (error) {
        console.error('Error getting maintenance mode:', error);
        return false; // Default to not in maintenance mode
      }
      return data === true;
    } catch (error: any) {
      console.error('Error getting maintenance mode:', error);
      return false; // Default to not in maintenance mode
    }
  }

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
            }
          };
        }
        return { error: error.message };
      }

      // Convert array of {setting_key, setting_value} to object
      const settings: SystemSettings = {
        maintenance_mode: false,
      };

      if (data) {
        data.forEach((item) => {
          const key = item.setting_key as keyof SystemSettings;
          let value = item.setting_value;

          if (key === 'maintenance_mode') {
            // Handle JSONB values - Supabase returns them as-is
            // If it's already a boolean, use it directly
            if (typeof value === 'boolean') {
              settings[key] = value;
            } else if (value === true || value === false) {
              // Handle explicit true/false values
              settings[key] = value;
            } else if (typeof value === 'string') {
              // If it's a string, convert to boolean
              settings[key] = value.toLowerCase() === 'true';
            } else if (value === null || value === undefined) {
              // Keep default value (already set above)
            }
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
      const updates = Object.entries(settings).map(([key, value]) => {
        // Ensure boolean values are stored as actual booleans, not strings
        let normalizedValue = value;
        if (typeof value === 'string') {
          normalizedValue = value.toLowerCase() === 'true';
        }
        return {
          setting_key: key,
          setting_value: normalizedValue,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        };
      });

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
    };
    return defaults[key];
  }
}

