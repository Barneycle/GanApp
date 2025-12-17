import { supabase } from '../lib/supabaseClient';
import { logActivity, createActivityDetails } from '../utils/activityLogger';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'organizer' | 'participant';
  prefix?: string;
  first_name?: string;
  middle_initial?: string;
  last_name?: string;
  affix?: string;
  avatar_url?: string;
  affiliated_organization?: string;
  created_at: string;
  updated_at: string;
}

export class UserService {
  static async checkEmailExists(email: string): Promise<{ exists: boolean; error?: string }> {
    try {
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        return { exists: false, error: 'Invalid email format' };
      }

      // Call RPC function to check if email exists in auth.users
      const { data, error } = await supabase.rpc('check_email_exists', {
        user_email: trimmedEmail
      });

      if (error) {
        console.error('RPC error checking email existence:', error);
        // Return error so caller knows the check failed
        return { exists: false, error: error.message || 'Unable to check email' };
      }

      // Verify we got valid data
      if (data === null || data === undefined) {
        console.warn('Email check returned null/undefined');
        return { exists: false, error: 'No response from email check' };
      }

      // Check if the response has an error field (from SQL exception)
      if (data.error) {
        console.error('SQL error in email check:', data.error);
        return { exists: false, error: data.error };
      }

      // Return the exists value (should be boolean)
      return { exists: data.exists === true };
    } catch (error: any) {
      console.error('Exception checking email existence:', error);
      return { exists: false, error: error?.message || 'Unable to check email' };
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        return null;
      }

      if (!user) {
        return null;
      }

      const bannedUntilRaw = user.user_metadata?.banned_until;
      const isActiveMeta = user.user_metadata?.is_active;
      const now = new Date();
      const bannedUntil = bannedUntilRaw ? new Date(bannedUntilRaw) : null;

      if ((bannedUntil && bannedUntil > now) || isActiveMeta === false) {
        await supabase.auth.signOut();
        return null;
      }

      // Use Supabase Auth user metadata for role
      const role = user.user_metadata?.role || 'participant';

      // Create user object from Supabase Auth data
      const userData: User = {
        id: user.id,
        email: user.email || '',
        role: role,
        prefix: user.user_metadata?.prefix || '',
        first_name: user.user_metadata?.first_name || '',
        middle_initial: user.user_metadata?.middle_initial || '',
        last_name: user.user_metadata?.last_name || '',
        affix: user.user_metadata?.affix || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        affiliated_organization: user.user_metadata?.affiliated_organization || '',
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
            prefix: userData.prefix || '',
            first_name: userData.first_name || '',
            middle_initial: userData.middle_initial || '',
            last_name: userData.last_name || '',
            affix: userData.affix || '',
            avatar_url: userData.avatar_url || '',
            affiliated_organization: userData.affiliated_organization || ''
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
          prefix: data.user.user_metadata?.prefix || '',
          first_name: data.user.user_metadata?.first_name || '',
          middle_initial: data.user.user_metadata?.middle_initial || '',
          last_name: data.user.user_metadata?.last_name || '',
          affix: data.user.user_metadata?.affix || '',
          avatar_url: data.user.user_metadata?.avatar_url || '',
          affiliated_organization: data.user.user_metadata?.affiliated_organization || '',
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

  static async signIn(email: string, password: string, rememberMe: boolean = false): Promise<{ user?: User; error?: string; errorType?: 'email' | 'password' | 'generic' }> {
    try {
      // Set session persistence based on rememberMe
      // If rememberMe is true, use localStorage (persistent session)
      // If false, use sessionStorage (session-only)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Store rememberMe preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      if (error) {
        // Parse error to determine if it's email or password issue
        const errorMsg = error.message.toLowerCase();
        let errorType: 'email' | 'password' | 'generic' = 'generic';

        // Check for specific error patterns
        if (errorMsg.includes('email') && (errorMsg.includes('not found') || errorMsg.includes('does not exist') || errorMsg.includes('user not found'))) {
          errorType = 'email';
        } else if (errorMsg.includes('password') && (errorMsg.includes('incorrect') || errorMsg.includes('wrong') || errorMsg.includes('invalid'))) {
          errorType = 'password';
        } else if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid credentials')) {
          // For generic "Invalid login credentials", try to determine which one
          // We can't reliably check email existence without exposing user data
          // So we'll return a generic error but let the UI handle it
          errorType = 'generic';
        }

        return { error: error.message, errorType };
      }

      if (!data.session || !data.user) {
        return { error: 'Failed to establish session. Please try again.' };
      }

      // Small delay to ensure session is fully established
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify session is properly established
      const { data: { session: verifySession }, error: verifyError } = await supabase.auth.getSession();
      if (verifyError) {
        return { error: verifyError.message || 'Session could not be verified. Please try again.' };
      }

      if (!verifySession || !verifySession.user) {
        return { error: 'Session could not be verified. Please try again.' };
      }

      if (data.user) {
        const metadata = data.user.user_metadata || {};
        const bannedUntilRaw = metadata?.banned_until;
        const isActiveMeta = metadata?.is_active;
        const now = new Date();
        const bannedUntil = bannedUntilRaw ? new Date(bannedUntilRaw) : null;

        if ((bannedUntil && bannedUntil > now) || isActiveMeta === false) {
          await supabase.auth.signOut();
          if (bannedUntil && bannedUntil > now) {
            return { error: `Your account is banned until ${bannedUntil.toLocaleString()}. Please contact support.` };
          }
          return { error: 'Your account is currently inactive. Please contact support.' };
        }

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
          avatar_url: data.user.user_metadata?.avatar_url || '',
          affiliated_organization: data.user.user_metadata?.affiliated_organization || '',
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at
        };

        return { user: userData };
      }

      return { error: 'Failed to sign in' };
    } catch (error: any) {
      return { error: error?.message || 'An unexpected error occurred' };
    }
  }

  static async signOut(): Promise<{ error?: string }> {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: error.message };
      }

      // Verify session is cleared
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Force another sign out if session still exists
        await supabase.auth.signOut();
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async resetPassword(email: string): Promise<{ error?: string; success?: boolean }> {
    try {
      // Get the current origin for web redirect
      const redirectTo = `${window.location.origin}/reset-password`;

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

      // Store old user data for activity logging
      const oldUserData: User | null = currentUser ? {
        id: currentUser.id,
        email: currentUser.email || '',
        role: currentUser.user_metadata?.role || 'participant',
        prefix: currentUser.user_metadata?.prefix || '',
        first_name: currentUser.user_metadata?.first_name || '',
        middle_initial: currentUser.user_metadata?.middle_initial || '',
        last_name: currentUser.user_metadata?.last_name || '',
        affix: currentUser.user_metadata?.affix || '',
        avatar_url: currentUser.user_metadata?.avatar_url || '',
        affiliated_organization: currentUser.user_metadata?.affiliated_organization || '',
        created_at: currentUser.created_at,
        updated_at: currentUser.updated_at || currentUser.created_at
      } : null;

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
          email: data.user.email || '', // This will be the new email if confirmation is disabled, or old email until confirmed
          role: data.user.user_metadata?.role || 'participant',
          prefix: data.user.user_metadata?.prefix || '',
          first_name: data.user.user_metadata?.first_name || '',
          middle_initial: data.user.user_metadata?.middle_initial || '',
          last_name: data.user.user_metadata?.last_name || '',
          affix: data.user.user_metadata?.affix || '',
          avatar_url: data.user.user_metadata?.avatar_url || '',
          affiliated_organization: data.user.user_metadata?.affiliated_organization || '',
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at
        };

        // Log activity
        if (oldUserData) {
          const changedFields = Object.keys(updates).filter(key => {
            const updateKey = key as keyof User;
            return updates[updateKey] !== undefined && updates[updateKey] !== oldUserData[updateKey];
          });
          logActivity(
            userId,
            'update',
            'user',
            {
              resourceId: userData.id,
              resourceName: `${userData.first_name} ${userData.last_name}`.trim() || userData.email,
              details: createActivityDetails(oldUserData, userData, changedFields)
            }
          ).catch(err => console.error('Failed to log user profile update:', err));
        }

        // Check if email confirmation is needed
        // If email was changed and data.user.email matches the new email, confirmation was NOT needed (email updated immediately)
        // If email was changed but data.user.email still shows old email, confirmation IS needed
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

  static async uploadAvatar(userId: string, file: File): Promise<{ url?: string; error?: string }> {
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage with upsert enabled
      // Store files in user-specific folders: userId/filename
      const { data, error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(`${userId}/${fileName}`, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Provide helpful error message for RLS issues
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
