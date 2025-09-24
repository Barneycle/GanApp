import { supabase } from '../lib/supabaseClient';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'organizer' | 'participant';
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
}

export class UserService {
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        return null;
      }
      
      if (!user) {
        return null;
      }

      // Use Supabase Auth user metadata for role
      const role = user.user_metadata?.role || 'participant';
      
      // Create user object from Supabase Auth data
      const userData: User = {
        id: user.id,
        email: user.email,
        role: role,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      };
      
      return userData;
    } catch (error) {
      return null;
    }
  }

  static async signUp(email: string, password: string, userData: Partial<User>): Promise<{ user?: User; error?: string; message?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: userData.role || 'participant',
            first_name: userData.first_name || '',
            last_name: userData.last_name || ''
          }
        }
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        // Create user object from Supabase Auth data
        const user: User = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'participant',
          first_name: data.user.user_metadata?.first_name || '',
          last_name: data.user.user_metadata?.last_name || '',
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at
        };
        
        return { user, message: 'User created successfully' };
      }

      return { error: 'Failed to create user' };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async signIn(email: string, password: string): Promise<{ user?: User; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        // Use Supabase Auth user metadata for role
        const role = data.user.user_metadata?.role || 'participant';
        
        // Create user object from Supabase Auth data
        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          role: role,
          first_name: data.user.user_metadata?.first_name || '',
          last_name: data.user.user_metadata?.last_name || '',
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at
        };
        
        return { user: userData };
      }

      return { error: 'Failed to sign in' };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async signOut(): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateProfile(userId: string, updates: Partial<User>): Promise<{ user?: User; error?: string }> {
    try {
      // Update user metadata in Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        data: {
          role: updates.role,
          first_name: updates.first_name,
          last_name: updates.last_name
        }
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'participant',
          first_name: data.user.user_metadata?.first_name || '',
          last_name: data.user.user_metadata?.last_name || '',
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at
        };
        
        return { user: userData };
      }

      return { error: 'Failed to update user' };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getAllUsers(): Promise<{ users?: User[]; error?: string }> {
    try {
      // Since we're using Supabase Auth metadata, we can't easily get all users
      // This would require admin access to auth.users table
      return { error: 'Getting all users requires admin access to auth.users table' };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async deleteUser(userId: string): Promise<{ error?: string }> {
    try {
      // This would require admin access to delete users from Supabase Auth
      return { error: 'Deleting users requires admin access to auth.users table' };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}
