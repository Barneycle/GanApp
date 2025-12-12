import { supabase } from '../lib/supabaseClient';
import { logActivity } from '../utils/activityLogger';
import { EmailService } from './emailService';
import { NotificationService } from './notificationService';

export interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'organizer' | 'participant';
  user_type?: string;
  organization?: string;
  is_active?: boolean;
  banned_until?: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
}

export interface AdminEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  venue: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  current_participants: number;
  max_participants?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CancellationRequest {
  id: string;
  event_id: string;
  event_title?: string;
  requested_by: string;
  requester_name?: string;
  request_reason: string;
  cancellation_date: string;
  additional_notes?: string;
  status: 'pending' | 'approved' | 'declined';
  reviewed_by?: string;
  review_notes?: string;
  reviewed_at?: string;
  requested_at: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  banned_users: number;
  total_events: number;
  published_events: number;
  cancelled_events: number;
  pending_cancellations: number;
  total_registrations: number;
  total_certificates: number;
}

export class AdminService {
  /**
   * Get archived users (admin only)
   */
  static async getArchivedUsers(): Promise<{ users?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('archived_users')
        .select('*')
        .order('archived_at', { ascending: false });

      if (error) {
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          return { users: [], error: 'Archived users table not found. Please run the database migration.' };
        }
        return { error: error.message || 'Failed to fetch archived users' };
      }

      return { users: data || [] };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get all users (admin only) - excludes archived users
   */
  static async getAllUsers(): Promise<{ users?: AdminUser[]; error?: string; warning?: string }> {
    try {
      const {
        data,
        error
      } = await supabase.rpc('list_users', {
        requested_by_uuid: (await supabase.auth.getUser()).data.user?.id,
        active_only: false,
        role_filter: null
      });

      if (error) {
        if (error.message?.includes('Could not find the function public.list_users')) {
          return {
            users: [],
            warning:
              'User listings require the `list_users` Supabase function, which has not been installed yet. Admin tools will still work, but user data is unavailable until that RPC is added.'
          };
        }
        return { error: error.message || 'Failed to fetch users' };
      }

      if (!data || !data.success) {
        return { error: data?.error || 'Failed to fetch users' };
      }

      return { users: data.users || [] };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Could not find the function public.list_users')) {
        return {
          users: [],
          warning:
            'User listings require the `list_users` Supabase function, which has not been installed yet. Admin tools will still work, but user data is unavailable until that RPC is added.'
        };
      }
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Ban a user
   * Note: This requires an RPC function to update auth.users metadata
   * For now, we'll update a users table if it exists, or create an RPC function
   */
  static async banUser(userId: string, banUntil: Date, reason?: string): Promise<{ success?: boolean; error?: string }> {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'Not authenticated' };
      }

      const { data, error } = await supabase.rpc('ban_user', {
        target_user_uuid: userId,
        banned_until: banUntil.toISOString(),
        banned_by_uuid: user.id,
        ban_reason: reason ?? null
      });

      if (error) {
        if (error.message?.includes('function ban_user')) {
          return {
            error:
              'Banning users requires the `ban_user` Supabase function. Please run the admin SQL migrations to install it.'
          };
        }
        return { error: error.message || 'Failed to ban user.' };
      }

      if (data?.success === false) {
        return { error: data?.error || 'Failed to ban user.' };
      }

      // Log activity and send email - need to fetch user email/name
      try {
        const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(userId);
        const userName = targetUser ? `${targetUser.user_metadata?.first_name || ''} ${targetUser.user_metadata?.last_name || ''}`.trim() || targetUser.email || userId : userId;
        const userEmail = targetUser?.email;
        
        // Log activity
        logActivity(
          user.id,
          'update',
          'user',
          {
            resourceId: userId,
            resourceName: userName,
            details: { user_id: userId, action: 'ban', banned_until: banUntil.toISOString(), reason }
          }
        ).catch(err => console.error('Failed to log user ban:', err));

        // Send email notification
        if (userEmail) {
          EmailService.sendBanEmail(userEmail, userName, banUntil, reason).catch(err => 
            console.error('Failed to send ban email:', err)
          );

          // Also create an in-app notification
          NotificationService.createNotification(
            userId,
            'Account Suspended',
            `Your account has been suspended${banUntil.getTime() > new Date('2099-12-31').getTime() ? ' permanently' : ` until ${banUntil.toLocaleDateString()}`}.${reason ? ` Reason: ${reason}` : ''}`,
            'error',
            { priority: 'urgent' }
          ).catch(err => console.error('Failed to create ban notification:', err));
        }
      } catch (logErr) {
        // Don't fail the ban operation if logging/email fails
        console.error('Failed to fetch user for logging/email:', logErr);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.message.includes('function ban_user')) {
        return {
          error:
            'Banning users requires the `ban_user` Supabase function. Please run the admin SQL migrations to install it.'
        };
      }
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Unban a user
   */
  static async unbanUser(userId: string): Promise<{ success?: boolean; error?: string }> {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'Not authenticated' };
      }

      const { data, error } = await supabase.rpc('unban_user', {
        target_user_uuid: userId,
        unbanned_by_uuid: user.id
      });

      if (error) {
        if (error.message?.includes('function unban_user')) {
          return {
            error:
              'Unbanning users requires the `unban_user` Supabase function. Please run the admin SQL migrations to install it.'
          };
        }
        return { error: error.message || 'Failed to unban user.' };
      }

      if (data?.success === false) {
        return { error: data?.error || 'Failed to unban user.' };
      }

      // Log activity and send email - need to fetch user email/name
      try {
        const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(userId);
        const userName = targetUser ? `${targetUser.user_metadata?.first_name || ''} ${targetUser.user_metadata?.last_name || ''}`.trim() || targetUser.email || userId : userId;
        const userEmail = targetUser?.email;
        
        // Log activity
        logActivity(
          user.id,
          'update',
          'user',
          {
            resourceId: userId,
            resourceName: userName,
            details: { user_id: userId, action: 'unban' }
          }
        ).catch(err => console.error('Failed to log user unban:', err));

        // Send email notification
        if (userEmail) {
          EmailService.sendUnbanEmail(userEmail, userName).catch(err => 
            console.error('Failed to send unban email:', err)
          );

          // Also create an in-app notification
          NotificationService.createNotification(
            userId,
            'Account Access Restored',
            'Your account suspension has been lifted. You can now access your account and use all GanApp services.',
            'success',
            { priority: 'high' }
          ).catch(err => console.error('Failed to create unban notification:', err));
        }
      } catch (logErr) {
        // Don't fail the unban operation if logging/email fails
        console.error('Failed to fetch user for logging/email:', logErr);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.message.includes('function unban_user')) {
        return {
          error:
            'Unbanning users requires the `unban_user` Supabase function. Please run the admin SQL migrations to install it.'
        };
      }
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Change user role
   */
  static async changeUserRole(userId: string, newRole: 'admin' | 'organizer' | 'participant'): Promise<{ success?: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'Not authenticated' };
      }

      const { error } = await supabase.rpc('assign_user_role', {
        target_user_uuid: userId,
        new_role_text: newRole,
        assigned_by_uuid: user.id
      });

      if (error) {
        if (error.message?.includes('relation "users" does not exist')) {
          return {
            error:
              'Changing roles requires the `assign_user_role` Supabase function that updates auth metadata. Please run the admin SQL migrations to install it.'
          };
        }
        if (error.message?.includes('function assign_user_role')) {
          return {
            error:
              'The `assign_user_role` function is missing. Run the admin SQL migrations to add it to your Supabase project.'
          };
        }
        return { error: error.message };
      }

      // Log activity - need to fetch user email/name for logging
      try {
        const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(userId);
        const userName = targetUser ? `${targetUser.user_metadata?.first_name || ''} ${targetUser.user_metadata?.last_name || ''}`.trim() || targetUser.email || userId : userId;
        logActivity(
          user.id,
          'update',
          'user',
          {
            resourceId: userId,
            resourceName: userName,
            details: { user_id: userId, action: 'change_role', new_role: newRole }
          }
        ).catch(err => console.error('Failed to log role change:', err));
      } catch (logErr) {
        // Don't fail the role change operation if logging fails
        console.error('Failed to fetch user for logging:', logErr);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.message.includes('relation "users"')) {
        return {
          error:
            'Changing roles requires the `assign_user_role` Supabase function that updates auth metadata. Please run the admin SQL migrations to install it.'
        };
      }
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Unarchive a user (restore from archived state)
   */
  static async unarchiveUser(userId: string): Promise<{ success?: boolean; error?: string }> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return { error: 'Not authenticated' };
      }

      // Call the unarchive_user_account RPC function
      const { data, error } = await supabase.rpc('unarchive_user_account', {
        user_uuid: userId
      });

      if (error) {
        if (error.message?.includes('function unarchive_user_account')) {
          return {
            error:
              'Unarchiving users requires the `unarchive_user_account` Supabase function. Please run the SQL migration to create it.'
          };
        }
        return { error: error.message || 'Failed to unarchive user' };
      }

      if (!data || !data.success) {
        return { error: data?.error || 'Failed to unarchive user' };
      }

      // Log activity
      try {
        const userName = data.email || userId;
        logActivity(
          currentUser.id,
          'update',
          'user',
          {
            resourceId: userId,
            resourceName: userName,
            details: { user_id: userId, action: 'unarchive', email: data.email }
          }
        ).catch(err => console.error('Failed to log user unarchive:', err));
      } catch (logErr) {
        console.error('Failed to log user unarchive:', logErr);
      }

      return { success: true };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Archive a user (soft delete - marks as inactive)
   */
  static async archiveUser(userId: string, reason: string): Promise<{ success?: boolean; error?: string }> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return { error: 'Not authenticated' };
      }

      // Call the archive_user_account RPC function
      const { data, error } = await supabase.rpc('archive_user_account', {
        user_uuid: userId,
        archive_reason_text: reason,
        archive_type_text: 'admin_action',
        admin_uuid: currentUser.id
      });

      if (error) {
        if (error.message?.includes('function archive_user_account')) {
          return {
            error:
              'Archiving users requires the `archive_user_account` Supabase function. Please run the SQL migration to create it.'
          };
        }
        return { error: error.message || 'Failed to archive user' };
      }

      if (!data || !data.success) {
        return { error: data?.error || 'Failed to archive user' };
      }

      // Log activity - need to fetch user email/name for logging
      try {
        const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(userId);
        const userName = targetUser ? `${targetUser.user_metadata?.first_name || ''} ${targetUser.user_metadata?.last_name || ''}`.trim() || targetUser.email || userId : userId;
        logActivity(
          currentUser.id,
          'delete',
          'user',
          {
            resourceId: userId,
            resourceName: userName,
            details: { user_id: userId, action: 'archive', reason }
          }
        ).catch(err => console.error('Failed to log user archive:', err));
      } catch (logErr) {
        // Don't fail the archive operation if logging fails
        console.error('Failed to fetch user for logging:', logErr);
      }

      return { success: true };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Get all events
   */
  static async getAllEvents(): Promise<{ events?: AdminEvent[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { events: data || [] };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Cancel an event
   */
  static async cancelEvent(eventId: string, reason?: string): Promise<{ success?: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Archive an event
   */
  static async archiveEvent(eventId: string, reason?: string): Promise<{ success?: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('archive_event', {
        event_uuid: eventId,
        archive_reason_text: reason || 'Archived by admin'
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get pending cancellation requests
   */
  static async getCancellationRequests(): Promise<{ requests?: CancellationRequest[]; error?: string }> {
    try {
      // First, get all cancellation requests (including pending ones)
      const { data: requestsData, error: requestsError } = await supabase
        .from('event_cancellation_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching cancellation requests:', requestsError);
        return { error: requestsError.message };
      }

      if (!requestsData || requestsData.length === 0) {
        return { requests: [] };
      }

      // Get event IDs to fetch event titles
      const eventIds = [...new Set(requestsData.map(req => req.event_id))];
      
      // Fetch event titles
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title')
        .in('id', eventIds);

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        // Continue even if events fetch fails - we'll use 'Unknown Event'
      }

      // Create a map of event_id to event_title
      const eventTitleMap = new Map();
      if (eventsData) {
        eventsData.forEach(event => {
          eventTitleMap.set(event.id, event.title);
        });
      }

      // Transform data to include event title and filter for pending requests
      const requests = requestsData
        .filter(req => req.status === 'pending')
        .map(req => ({
          ...req,
          event_title: eventTitleMap.get(req.event_id) || 'Unknown Event'
        }));

      return { requests };
    } catch (error) {
      console.error('Exception in getCancellationRequests:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Review cancellation request (approve/decline) - Admin only
   */
  static async reviewCancellationRequest(
    requestId: string,
    status: 'approved' | 'declined',
    reviewNotes?: string
  ): Promise<{ success?: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'Not authenticated' };
      }

      // Verify user is an admin before proceeding
      const userRole = user.user_metadata?.role;
      if (userRole !== 'admin') {
        return { error: 'Only administrators can review cancellation requests' };
      }

      const { error } = await supabase.rpc('review_cancellation_request', {
        request_uuid: requestId,
        new_status_text: status,
        reviewed_by_uuid: user.id,
        review_notes_text: reviewNotes || null
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get admin dashboard statistics
   */
  static async getDashboardStats(): Promise<{ stats?: AdminStats; error?: string; warning?: string }> {
    try {
      let warning: string | undefined;
      let allUsers: AdminUser[] = [];

      try {
        const { data: usersData, error: usersError } = await supabase.rpc('list_users', {
          requested_by_uuid: (await supabase.auth.getUser()).data.user?.id,
          active_only: false,
          role_filter: null
        });

        if (usersError) {
          throw usersError;
        }

        allUsers = usersData?.users || [];
      } catch (usersError: any) {
        warning =
          'User metrics are limited because the `list_users` Supabase function is not available. Run the admin SQL migrations to enable full analytics.';
        allUsers = [];
      }

      const activeUsers = allUsers.filter(u => u.is_active !== false);
      const bannedUsers = allUsers.filter(u => u.banned_until && new Date(u.banned_until) > new Date());

      // Get event counts
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('status');

      if (eventsError) {
        return { error: eventsError.message };
      }

      const events = eventsData || [];
      const publishedEvents = events.filter(e => e.status === 'published');
      const cancelledEvents = events.filter(e => e.status === 'cancelled');

      // Get pending cancellations
      const { data: cancellationsData } = await supabase
        .from('event_cancellation_requests')
        .select('id')
        .eq('status', 'pending');

      // Get registration count
      const { count: registrationsCount } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true });

      // Get certificate count
      const { count: certificatesCount } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true });

      const stats: AdminStats = {
        total_users: allUsers.length,
        active_users: activeUsers.length,
        banned_users: bannedUsers.length,
        total_events: events.length,
        published_events: publishedEvents.length,
        cancelled_events: cancelledEvents.length,
        pending_cancellations: cancellationsData?.length || 0,
        total_registrations: registrationsCount || 0,
        total_certificates: certificatesCount || 0
      };

      return { stats, warning };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get event statistics
   */
  static async getEventStatistics(eventId: string): Promise<{ stats?: any; error?: string }> {
    try {
      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        return { error: eventError.message };
      }

      // Get registrations
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId);

      // Get attendance
      const { data: attendance } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_validated', true);

      // Get survey responses
      const { data: surveys } = await supabase
        .from('surveys')
        .select('id')
        .eq('event_id', eventId);

      const surveyIds = surveys?.map(e => e.id) || [];
      const { data: responses } = surveyIds.length > 0
        ? await supabase
            .from('survey_responses')
            .select('*')
            .in('survey_id', surveyIds)
        : { data: [] };

      // Get certificates
      const { data: certificates } = await supabase
        .from('certificates')
        .select('*')
        .eq('event_id', eventId);

      return {
        stats: {
          event,
          total_registrations: registrations?.length || 0,
          total_attendance: attendance?.length || 0,
          attendance_rate: registrations?.length > 0 
            ? ((attendance?.length || 0) / registrations.length * 100).toFixed(2) + '%'
            : '0%',
          total_surveys: surveys?.length || 0,
          total_responses: responses?.length || 0,
          response_rate: surveys?.length > 0
            ? ((responses?.length || 0) / surveys.length * 100).toFixed(2) + '%'
            : '0%',
          total_certificates: certificates?.length || 0
        }
      };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Create a new user (admin only)
   * Requires email, password, confirm password, and role
   */
  static async createUser(
    email: string,
    password: string,
    confirmPassword: string,
    role: 'admin' | 'organizer' | 'participant' = 'participant'
  ): Promise<{ success?: boolean; error?: string; userId?: string }> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return { error: 'Not authenticated' };
      }

      // Validate passwords match
      if (password !== confirmPassword) {
        return { error: 'Passwords do not match' };
      }

      // Validate password strength
      if (password.length < 6) {
        return { error: 'Password must be at least 6 characters long' };
      }

      // Validate role
      if (!['admin', 'organizer', 'participant'].includes(role)) {
        return { error: 'Invalid role' };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: 'Invalid email format' };
      }

      // Step 1: Validate admin permissions and check if email exists
      const validationResult = await supabase.rpc('create_user_account', {
        user_email: email,
        user_password: password,
        user_role: role,
        created_by_uuid: currentUser.id
      });

      if (validationResult.error) {
        return { error: validationResult.error.message || 'Validation failed' };
      }

      if (!validationResult.data || !validationResult.data.success) {
        return { error: validationResult.data?.error || 'Validation failed' };
      }

      // Step 2: Save current admin session before creating user
      // This prevents the new user from being auto-signed in
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      
      if (!adminSession) {
        return { error: 'Admin session not found. Please log in again.' };
      }

      // Step 3: Create user using Supabase Auth signUp
      // This works client-side and doesn't require service role key
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
            // Mark as admin-created for tracking
            created_by_admin: true,
            admin_creator_id: currentUser.id
          },
          // Note: Email confirmation will depend on Supabase project settings
          // To auto-confirm admin-created users, you need to either:
          // 1. Disable email confirmation in Supabase Auth settings (not recommended)
          // 2. Use a server-side function with service role key to auto-confirm
        }
      });

      // Step 4: Immediately restore admin session to prevent auto-sign-in
      // This ensures the admin stays logged in and the new user is not signed in
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token
      });

      if (authError) {
        // Provide user-friendly error messages
        if (authError.message?.toLowerCase().includes('already registered') || 
            authError.message?.toLowerCase().includes('already exists') ||
            authError.message?.toLowerCase().includes('user already registered') ||
            authError.message?.toLowerCase().includes('email already exists')) {
          return { error: 'An account with this email already exists' };
        }
        return { error: authError.message || 'Failed to create user' };
      }

      if (!authData.user) {
        return { error: 'Failed to create user account' };
      }

      // Log activity
      logActivity(
        currentUser.id,
        'create',
        'user',
        {
          resourceId: authData.user.id,
          resourceName: email,
          details: { user_id: authData.user.id, email, role, created_by: currentUser.id }
        }
      ).catch(err => console.error('Failed to log user creation:', err));

      return { success: true, userId: authData.user.id };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    }
  }

  /**
   * Update user information (admin only)
   * Cannot update email
   */
  static async updateUser(
    userId: string,
    updates: {
      prefix?: string;
      first_name?: string;
      middle_initial?: string;
      last_name?: string;
      affix?: string;
      affiliated_organization?: string;
      role?: 'admin' | 'organizer' | 'participant';
    }
  ): Promise<{ success?: boolean; error?: string }> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return { error: 'Not authenticated' };
      }

      // Get current user profile to get email for logging
      let targetUserEmail = '';
      try {
        const { data: userData } = await supabase.rpc('get_user_profile', { user_id: userId });
        if (userData) {
          targetUserEmail = userData.email || '';
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }

      // Use RPC function to update user metadata
      const { data, error: rpcError } = await supabase.rpc('update_user_profile', {
        target_user_id: userId,
        prefix: updates.prefix ?? null,
        first_name: updates.first_name ?? null,
        middle_initial: updates.middle_initial ?? null,
        last_name: updates.last_name ?? null,
        affix: updates.affix ?? null,
        affiliated_organization: updates.affiliated_organization ?? null,
        role: updates.role ?? null
      });

      if (rpcError) {
        if (rpcError.message?.includes('function update_user_profile')) {
          return {
            error: 'Updating users requires the `update_user_profile` Supabase function. Please run the admin SQL migrations to install it.'
          };
        }
        return { error: rpcError.message || 'Failed to update user' };
      }

      if (data?.success === false) {
        return { error: data?.error || 'Failed to update user' };
      }

      // Log activity
      const userName = `${updates.first_name || ''} ${updates.last_name || ''}`.trim() || targetUserEmail || userId;
      logActivity(
        currentUser.id,
        'update',
        'user',
        {
          resourceId: userId,
          resourceName: userName,
          details: { user_id: userId, email: targetUserEmail, updates: Object.keys(updates) }
        }
      ).catch(err => console.error('Failed to log user update:', err));

      return { success: true };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    }
  }

  /**
   * Get all notifications (admin only)
   */
  static async getAllNotifications(limit: number = 100, offset: number = 0): Promise<{ notifications?: any[]; total?: number; error?: string }> {
    try {
      const { data, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { error: error.message };
      }

      // Fetch user information separately for each notification
      const notifications = data || [];
      const userIds = [...new Set(notifications.map(n => n.user_id))];
      
      // Get user profiles using RPC function or direct auth.users query
      const userMap = new Map();
      for (const userId of userIds) {
        try {
          const { data: { user } } = await supabase.auth.admin.getUserById(userId);
          if (user) {
            userMap.set(userId, {
              email: user.email,
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || ''
            });
          }
        } catch (err) {
          // If we can't fetch user, just use the user_id
          userMap.set(userId, { email: userId, first_name: '', last_name: '' });
        }
      }

      // Attach user info to notifications
      const notificationsWithUsers = notifications.map(notification => ({
        ...notification,
        user: userMap.get(notification.user_id) || { email: notification.user_id, first_name: '', last_name: '' }
      }));

      return { notifications: notificationsWithUsers, total: count || 0 };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  static async sendBulkNotifications(
    userIds: string[],
    title: string,
    message: string,
    type: 'success' | 'warning' | 'error' | 'info' = 'info',
    options?: {
      action_url?: string;
      action_text?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      expires_at?: string;
    }
  ): Promise<{ success?: boolean; sent?: number; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'Not authenticated' };
      }

      const notifications = userIds.map(userId => ({
        user_id: userId,
        title,
        message,
        type,
        action_url: options?.action_url,
        action_text: options?.action_text,
        priority: options?.priority || 'normal',
        expires_at: options?.expires_at,
        read: false
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) {
        return { error: error.message };
      }

      // Log activity
      logActivity(
        user.id,
        'create',
        'notification',
        {
          resourceId: 'bulk',
          resourceName: `Bulk notification: ${title}`,
          details: { user_ids: userIds, count: userIds.length, type, title }
        }
      ).catch(err => console.error('Failed to log bulk notification:', err));

      return { success: true, sent: data?.length || 0 };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Send notification to all users (admin only)
   */
  static async sendNotificationToAll(
    title: string,
    message: string,
    type: 'success' | 'warning' | 'error' | 'info' = 'info',
    options?: {
      action_url?: string;
      action_text?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      expires_at?: string;
      roleFilter?: 'admin' | 'organizer' | 'participant';
    }
  ): Promise<{ success?: boolean; sent?: number; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'Not authenticated' };
      }

      // Get all user IDs
      const { data: usersData, error: usersError } = await supabase.rpc('list_users', {
        requested_by_uuid: user.id,
        active_only: true,
        role_filter: options?.roleFilter || null
      });

      if (usersError) {
        return { error: usersError.message || 'Failed to fetch users' };
      }

      if (!usersData || !usersData.success || !usersData.users || usersData.users.length === 0) {
        return { error: 'No users found' };
      }

      const userIds = usersData.users.map((u: any) => u.id);

      return await this.sendBulkNotifications(userIds, title, message, type, options);
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Delete notification (admin only)
   */
  static async deleteNotification(notificationId: string): Promise<{ success?: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Delete expired notifications (admin only)
   */
  static async deleteExpiredNotifications(): Promise<{ success?: boolean; deleted?: number; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) {
        return { error: error.message };
      }

      return { success: true, deleted: data?.length || 0 };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}

