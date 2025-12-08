import { supabase } from '../lib/supabaseClient';

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

export interface ActivityLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export class ActivityLogService {
  /**
   * Log an activity
   */
  static async logActivity(
    userId: string,
    action: string,
    resourceType: string,
    options?: {
      resourceId?: string;
      resourceName?: string;
      details?: any;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{ success: boolean; logId?: string; error?: string }> {
    try {
      // Get client IP and user agent if available
      const ipAddress = options?.ipAddress || null;
      const userAgent = options?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null);

      // Call the database function
      const { data, error } = await supabase.rpc('log_activity', {
        p_user_id: userId,
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: options?.resourceId || null,
        p_resource_name: options?.resourceName || null,
        p_details: options?.details || null,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      });

      if (error) {
        // Handle missing table/function error gracefully - don't fail the operation
        if (error.message?.includes('schema cache') || error.message?.includes('does not exist') || error.message?.includes('function') && error.message?.includes('log_activity')) {
          console.warn('Activity logs table or function not found. Activity logging is disabled. Please run the database migration to create the activity_logs table.');
          return { success: false, error: 'Activity logs table not found' };
        }
        console.error('Error logging activity:', error);
        return { success: false, error: error.message };
      }

      return { success: true, logId: data };
    } catch (error: any) {
      console.error('Error in logActivity:', error);
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  }

  /**
   * Get activity logs with filters
   */
  static async getActivityLogs(
    filters?: ActivityLogFilters,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ logs?: ActivityLog[]; total?: number; error?: string }> {
    try {
      let query = supabase
        .from('activity_logs')
        .select(`
          *
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }

      if (filters?.resourceId) {
        query = query.eq('resource_id', filters.resourceId);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters?.searchQuery) {
        const searchTerm = filters.searchQuery.toLowerCase();
        query = query.or(`resource_name.ilike.%${searchTerm}%,details::text.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        // Handle missing table error gracefully
        if (error.message?.includes('schema cache') || 
            error.message?.includes('does not exist') ||
            error.message?.includes('relation "activity_logs" does not exist')) {
          return { error: 'Activity logs table not found. Please run the database migration to create the activity_logs table.' };
        }
        // Handle RLS/permission errors
        if (error.message?.includes('permission denied') || 
            error.message?.includes('new row violates row-level security')) {
          return { error: 'Permission denied. Please ensure RLS policies are correctly configured for the activity_logs table.' };
        }
        // Return the actual error for debugging
        console.error('Activity logs query error:', error);
        return { error: error.message || 'Failed to load activity logs' };
      }

      // Fetch user information for each log using RPC function (if available)
      const logsWithUsers = await Promise.all((data || []).map(async (log) => {
        try {
          const { data: userData, error: rpcError } = await supabase.rpc('get_user_profile', { user_id: log.user_id });
          if (!rpcError && userData) {
            const profile = typeof userData === 'string' ? JSON.parse(userData) : userData;
            return {
              ...log,
              user: {
                id: log.user_id,
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                email: profile.email || '',
                role: profile.role || 'participant'
              }
            };
          }
        } catch (err) {
          // RPC function might not exist, that's okay - just show user_id
          console.warn('Failed to fetch user for activity log:', err);
        }
        // Fallback: return log with minimal user info
        return {
          ...log,
          user: {
            id: log.user_id,
            first_name: '',
            last_name: '',
            email: log.user_id.substring(0, 8) + '...', // Show partial ID as fallback
            role: 'participant'
          }
        };
      }));

      return { logs: logsWithUsers, total: count || 0 };
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' };
    }
  }

  /**
   * Get activity logs for a specific resource
   */
  static async getResourceActivity(
    resourceType: string,
    resourceId: string
  ): Promise<{ logs?: ActivityLog[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *
        `)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false });

      if (error) {
        // Handle missing table error gracefully
        if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
          return { error: 'Activity logs table not found. Please run the database migration to create the activity_logs table.' };
        }
        return { error: error.message };
      }

      // Fetch user information for each log (if RPC function is available)
      const logsWithUsers = await Promise.all((data || []).map(async (log) => {
        try {
          const { data: userData, error: rpcError } = await supabase.rpc('get_user_profile', { user_id: log.user_id });
          if (!rpcError && userData) {
            const profile = typeof userData === 'string' ? JSON.parse(userData) : userData;
            return {
              ...log,
              user: {
                id: log.user_id,
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                email: profile.email || '',
                role: profile.role || 'participant'
              }
            };
          }
        } catch (err) {
          // RPC function might not exist, that's okay - just show user_id
          console.warn('Failed to fetch user for activity log:', err);
        }
        // Fallback: return log with minimal user info
        return {
          ...log,
          user: {
            id: log.user_id,
            first_name: '',
            last_name: '',
            email: log.user_id.substring(0, 8) + '...', // Show partial ID as fallback
            role: 'participant'
          }
        };
      }));

      return { logs: logsWithUsers };
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' };
    }
  }

  /**
   * Get user activity summary
   */
  static async getUserActivitySummary(
    userId: string,
    days: number = 30
  ): Promise<{ summary?: any; error?: string }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('activity_logs')
        .select('action, resource_type, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (error) {
        // Handle missing table error gracefully
        if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
          return { error: 'Activity logs table not found. Please run the database migration to create the activity_logs table.' };
        }
        return { error: error.message };
      }

      // Group by action and resource type
      const summary: any = {
        totalActions: data?.length || 0,
        byAction: {} as Record<string, number>,
        byResourceType: {} as Record<string, number>,
        recentActions: data?.slice(0, 10) || []
      };

      data?.forEach(log => {
        summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
        summary.byResourceType[log.resource_type] = (summary.byResourceType[log.resource_type] || 0) + 1;
      });

      return { summary };
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' };
    }
  }

  /**
   * Delete old activity logs (admin only, for cleanup)
   */
  static async deleteOldLogs(
    olderThanDays: number = 365
  ): Promise<{ success: boolean; deleted?: number; error?: string }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data, error } = await supabase
        .from('activity_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        // Handle missing table error gracefully
        if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
          return { success: false, error: 'Activity logs table not found. Please run the database migration to create the activity_logs table.' };
        }
        return { success: false, error: error.message };
      }

      return { success: true, deleted: data?.length || 0 };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  }
}

