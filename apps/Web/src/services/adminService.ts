import { supabase } from '../lib/supabaseClient';

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
   * Get all users (admin only)
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
   * Archive a user (delete)
   */
  static async archiveUser(userId: string, reason: string): Promise<{ success?: boolean; error?: string }> {
    return {
      error:
        'Archiving users requires a backend RPC (e.g., archive_user_account) that manages auth metadata. Please run the admin SQL migrations or create the necessary Supabase function.'
    };
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
}

