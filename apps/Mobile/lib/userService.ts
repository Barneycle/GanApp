import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'organizer' | 'participant';
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

export class UserService {
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
          email: data.user.email || '',
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
      console.error('Sign up error:', error);
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
          email: data.user.email || '',
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
      console.error('Sign in error:', error);
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
      console.error('Sign out error:', error);
      return { error: 'An unexpected error occurred' };
    }
  }
}