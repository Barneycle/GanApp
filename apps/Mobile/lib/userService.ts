import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Linking from 'expo-linking';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'organizer' | 'participant';
  prefix?: string;
  first_name: string;
  middle_initial?: string;
  last_name: string;
  affix?: string;
  avatar_url?: string;
  affiliated_organization?: string;
  created_at: string;
  updated_at: string;
}

export class UserService {
  static async signUp(email: string, password: string, userData: Partial<User>): Promise<{ user?: User; error?: string; message?: string }> {
    try {
      // Build metadata object, only including fields that are provided
      const metadata: any = {
        role: userData.role || 'participant',
      };
      
      // Only include first_name if provided and not empty
      if (userData.first_name && userData.first_name.trim() !== '') {
        metadata.first_name = userData.first_name.trim();
      }
      
      // Only include last_name if provided and not empty
      if (userData.last_name && userData.last_name.trim() !== '') {
        metadata.last_name = userData.last_name.trim();
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        // Create user object from Supabase Auth data
        // Only use metadata values if they exist and are not empty
        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          role: data.user.user_metadata?.role || 'participant',
          first_name: data.user.user_metadata?.first_name && data.user.user_metadata.first_name.trim() !== '' 
            ? data.user.user_metadata.first_name 
            : '',
          last_name: data.user.user_metadata?.last_name && data.user.user_metadata.last_name.trim() !== '' 
            ? data.user.user_metadata.last_name 
            : '',
          affiliated_organization: data.user.user_metadata?.affiliated_organization && data.user.user_metadata.affiliated_organization.trim() !== ''
            ? data.user.user_metadata.affiliated_organization
            : '',
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
          prefix: data.user.user_metadata?.prefix || '',
          first_name: data.user.user_metadata?.first_name || '',
          middle_initial: data.user.user_metadata?.middle_initial || '',
          last_name: data.user.user_metadata?.last_name || '',
          affix: data.user.user_metadata?.affix || '',
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

  static async resetPassword(email: string): Promise<{ error?: string; success?: boolean }> {
    try {
      // Get the app scheme for deep linking
      // For Expo, this will be the app's scheme (e.g., 'ganapp://')
      const redirectTo = `${Linking.createURL('reset-password')}`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return { error: error.message || 'An unexpected error occurred' };
    }
  }

  static async updateProfile(userId: string, updates: Partial<User> & { originalEmail?: string }): Promise<{ user?: User; error?: string; needsEmailConfirmation?: boolean }> {
    try {
      // Get current user to preserve existing metadata
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Prepare update object for metadata - preserve existing values
      const updateData: any = {
        ...(currentUser?.user_metadata || {}), // Preserve existing metadata
      };

      // Update only the fields that are provided
      if (updates.role !== undefined) {
        updateData.role = updates.role;
      }
      if (updates.prefix !== undefined) {
        updateData.prefix = updates.prefix;
      }
      if (updates.first_name !== undefined) {
        updateData.first_name = updates.first_name;
      }
      if (updates.middle_initial !== undefined) {
        updateData.middle_initial = updates.middle_initial;
      }
      if (updates.last_name !== undefined) {
        updateData.last_name = updates.last_name;
      }
      if (updates.affix !== undefined) {
        updateData.affix = updates.affix;
      }
      if (updates.affiliated_organization !== undefined) {
        updateData.affiliated_organization = updates.affiliated_organization;
      }
      if (updates.avatar_url !== undefined) {
        updateData.avatar_url = updates.avatar_url;
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
        console.error('Error updating user:', error);
        return { error: error.message };
      }

      if (data.user) {
        console.log('User updated, metadata:', data.user.user_metadata);
        
        const userData: User = {
          id: data.user.id,
          email: data.user.email || '',
          role: data.user.user_metadata?.role || 'participant',
          prefix: data.user.user_metadata?.prefix || '',
          first_name: data.user.user_metadata?.first_name || '',
          middle_initial: data.user.user_metadata?.middle_initial || '',
          last_name: data.user.user_metadata?.last_name || '',
          affix: data.user.user_metadata?.affix || '',
          affiliated_organization: data.user.user_metadata?.affiliated_organization || '',
          avatar_url: data.user.user_metadata?.avatar_url || '',
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at
        };
        
        console.log('Returning user data:', {
          first_name: userData.first_name,
          last_name: userData.last_name,
          affiliated_organization: userData.affiliated_organization
        });
        
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
      // Convert file path to URI format for React Native
      const imageUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
      
      // Compress and resize image before upload (reduce file size for faster uploads)
      // Using same logic as camera.tsx for consistency and speed
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1920 } }], // Resize to max width of 1920px (maintains aspect ratio) - same as camera.tsx
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG } // 80% quality, JPEG format
      );

      // Read compressed file as base64 using expo-file-system
      const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to Uint8Array
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const bytes = new Uint8Array(byteNumbers);

      // Create a unique filename
      const fileExt = fileUri.split('.').pop() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage using Uint8Array with upsert enabled
      const { data, error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(`${userId}/${fileName}`, bytes, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
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