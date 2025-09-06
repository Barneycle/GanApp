import { supabase } from './supabase';

export class UserService {
  static async createUser(userData: any) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getUserById(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async updateUser(userId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
