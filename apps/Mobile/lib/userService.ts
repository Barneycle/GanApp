import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'organizer' | 'participant';
  first_name: string;
  last_name: string;
  avatar_url?: string;
  affiliated_organization?: string;
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

  static async updateProfile(userId: string, updates: Partial<User> & { originalEmail?: string }): Promise<{ user?: User; error?: string; needsEmailConfirmation?: boolean }> {
    try {
      // Prepare update object for metadata
      const updateData: any = {
        role: updates.role,
        first_name: updates.first_name,
        last_name: updates.last_name
      };

      // Add optional fields if provided
      if (updates.avatar_url !== undefined) {
        updateData.avatar_url = updates.avatar_url;
      }
      if (updates.affiliated_organization !== undefined) {
        updateData.affiliated_organization = updates.affiliated_organization;
      }

      // Check if email is being changed
      const isEmailChanging = updates.email && updates.email !== updates.originalEmail;

      // Update user metadata and email in Supabase Auth
      const updateParams: any = {
        data: updateData
      };
      
      // Only add email if it's being changed
      if (isEmailChanging) {
        updateParams.email = updates.email;
      }

      // Update user metadata and email in Supabase Auth
      const { data, error } = await supabase.auth.updateUser(updateParams);

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        const userData: User = {
          id: data.user.id,
          email: data.user.email || '',
          role: data.user.user_metadata?.role || 'participant',
          first_name: data.user.user_metadata?.first_name || '',
          last_name: data.user.user_metadata?.last_name || '',
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at
        };
        
        // Check if email confirmation is needed
        const emailUpdatedImmediately = isEmailChanging && 
          data.user.email && 
          updates.email &&
          data.user.email.toLowerCase() === updates.email.toLowerCase();
        
        const needsEmailConfirmation = Boolean(isEmailChanging && !emailUpdatedImmediately);
        
        return { 
          user: userData,
          needsEmailConfirmation: needsEmailConfirmation
        };
      }

      return { error: 'Failed to update user' };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updatePassword(currentPassword: string, newPassword: string): Promise<{ error?: string }> {
    try {
      // First verify the current password by attempting to sign in
      const { data: { user }, error: verifyError } = await supabase.auth.getUser();
      
      if (verifyError || !user) {
        return { error: 'Unable to verify current session. Please sign in again.' };
      }

      // Update the password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { error: error.message || 'Failed to update password' };
      }

      return {};
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' };
    }
  }

  static async uploadAvatar(userId: string, fileUri: string): Promise<{ url?: string; error?: string }> {
    try {
      // Read the file
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      // Create a unique filename
      const fileExt = fileUri.split('.').pop() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage with upsert enabled
      const { data, error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(`${userId}/${fileName}`, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: blob.type || 'image/jpeg'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('RLS')) {
          return { 
            error: 'Permission denied. Please ensure the storage bucket allows authenticated users to upload files. Contact your administrator.' 
          };
        }
        return { 
          error: uploadError.message || 'Failed to upload avatar. Please ensure you have permission to upload files.' 
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(`${userId}/${fileName}`);

      return { url: urlData.publicUrl };
    } catch (error: any) {
      console.error('Upload catch error:', error);
      return { error: error.message || 'Failed to upload avatar' };
    }
  }
}