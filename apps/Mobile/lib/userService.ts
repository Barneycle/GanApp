import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export class UserService {
  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting current user:', error);
        return { user: null, error: error.message };
      }

      if (!user) {
        return { user: null, error: 'No user found' };
      }

      // Create a basic user profile from auth data since profiles table doesn't exist
      const userProfile: User = {
        id: user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || 'User',
        last_name: user.user_metadata?.last_name || '',
        role: user.user_metadata?.role || 'participant',
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.updated_at || new Date().toISOString(),
      };

      return { user: userProfile, error: null };
    } catch (error) {
      console.error('Unexpected error in getCurrentUser:', error);
      return { user: null, error: 'An unexpected error occurred' };
    }
  }

  static async signUp(email: string, password: string, firstName: string, lastName: string, role: string = 'participant') {
    try {
      // Sign up user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role,
          }
        }
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Failed to create user' };
      }

      // Create user profile object from auth data
      const userProfile: User = {
        id: authData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        created_at: authData.user.created_at || new Date().toISOString(),
        updated_at: authData.user.updated_at || new Date().toISOString(),
      };

      return { user: userProfile, error: null };
    } catch (error) {
      console.error('Unexpected error in signUp:', error);
      return { user: null, error: 'An unexpected error occurred' };
    }
  }

  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null, error: 'Failed to sign in' };
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Error getting user profile:', profileError);
        return { user: null, error: profileError.message };
      }

      return { user: profile, error: null };
    } catch (error) {
      console.error('Unexpected error in signIn:', error);
      return { user: null, error: 'An unexpected error occurred' };
    }
  }

  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected error in signOut:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateProfile(userId: string, updates: Partial<User>) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { user: null, error: error.message };
      }

      return { user: data, error: null };
    } catch (error) {
      console.error('Unexpected error in updateProfile:', error);
      return { user: null, error: 'An unexpected error occurred' };
    }
  }
}
