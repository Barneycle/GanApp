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
          *,
          user:users!activity_logs_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          )
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
        return { error: error.message };
      }

      return { logs: data || [], total: count || 0 };
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
          *,
          user:users!activity_logs_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          )
        `)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { logs: data || [] };
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
        return { success: false, error: error.message };
      }

      return { success: true, deleted: data?.length || 0 };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  }
}

