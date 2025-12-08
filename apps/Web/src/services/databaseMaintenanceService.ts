import { supabase } from '../lib/supabaseClient';

export interface DatabaseStats {
  total_tables: number;
  total_rows: number;
  table_sizes: Array<{
    table_name: string;
    row_count: number;
    size_mb: number;
  }>;
}

export interface OrphanedRecords {
  table_name: string;
  count: number;
  description: string;
}

export interface SystemHealth {
  database_status: 'healthy' | 'warning' | 'critical';
  connection_pool: {
    active: number;
    idle: number;
    total: number;
  };
  storage_usage: {
    used_mb: number;
    available_mb: number;
    percentage: number;
  };
  last_backup?: string;
  issues: string[];
}

export class DatabaseMaintenanceService {
  /**
   * Get database statistics
   */
  static async getDatabaseStats(): Promise<{ stats?: DatabaseStats; error?: string }> {
    try {
      // Get table information
      const { data: tablesData, error: tablesError } = await supabase.rpc('get_table_stats');

      if (tablesError) {
        // Fallback: try to get basic table list
        const { data: schemaData } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');

        if (!schemaData || schemaData.length === 0) {
          return { 
            stats: {
              total_tables: 0,
              total_rows: 0,
              table_sizes: []
            }
          };
        }

        // If RPC doesn't exist, return basic stats
        return {
          stats: {
            total_tables: schemaData.length,
            total_rows: 0,
            table_sizes: schemaData.map((t: any) => ({
              table_name: t.table_name,
              row_count: 0,
              size_mb: 0
            }))
          },
          error: 'Detailed statistics require database functions. Some metrics may be unavailable.'
        };
      }

      const tables = tablesData || [];
      const totalRows = tables.reduce((sum: number, table: any) => sum + (table.row_count || 0), 0);

      return {
        stats: {
          total_tables: tables.length,
          total_rows: totalRows,
          table_sizes: tables.map((t: any) => ({
            table_name: t.table_name,
            row_count: t.row_count || 0,
            size_mb: t.size_mb || 0
          }))
        }
      };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get orphaned records (records with broken foreign key references)
   */
  static async getOrphanedRecords(): Promise<{ records?: OrphanedRecords[]; error?: string }> {
    try {
      const orphaned: OrphanedRecords[] = [];

      // Check notifications with invalid user_id
      const { count: orphanedNotifications } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .not('user_id', 'in', `(SELECT id FROM auth.users)`);

      if (orphanedNotifications && orphanedNotifications > 0) {
        orphaned.push({
          table_name: 'notifications',
          count: orphanedNotifications,
          description: 'Notifications with invalid user_id references'
        });
      }

      // Check event_registrations with invalid user_id
      const { count: orphanedRegistrations } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .not('user_id', 'in', `(SELECT id FROM auth.users)`);

      if (orphanedRegistrations && orphanedRegistrations > 0) {
        orphaned.push({
          table_name: 'event_registrations',
          count: orphanedRegistrations,
          description: 'Registrations with invalid user_id references'
        });
      }

      // Check event_registrations with invalid event_id
      const { count: orphanedEventRegs } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .not('event_id', 'in', `(SELECT id FROM events)`);

      if (orphanedEventRegs && orphanedEventRegs > 0) {
        orphaned.push({
          table_name: 'event_registrations',
          count: orphanedEventRegs,
          description: 'Registrations with invalid event_id references'
        });
      }

      // Check survey_responses with invalid survey_id
      const { count: orphanedSurveyResponses } = await supabase
        .from('survey_responses')
        .select('*', { count: 'exact', head: true })
        .not('survey_id', 'in', `(SELECT id FROM surveys)`);

      if (orphanedSurveyResponses && orphanedSurveyResponses > 0) {
        orphaned.push({
          table_name: 'survey_responses',
          count: orphanedSurveyResponses,
          description: 'Survey responses with invalid survey_id references'
        });
      }

      return { records: orphaned };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Clean up old activity logs
   */
  static async cleanupOldActivityLogs(daysToKeep: number = 90): Promise<{ success?: boolean; deleted?: number; error?: string }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await supabase
        .from('activity_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select();

      if (error) {
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          return { error: 'Activity logs table not found' };
        }
        return { error: error.message };
      }

      return { success: true, deleted: data?.length || 0 };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications(): Promise<{ success?: boolean; deleted?: number; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .not('expires_at', 'is', null)
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

  /**
   * Clean up old read notifications
   */
  static async cleanupOldReadNotifications(daysToKeep: number = 30): Promise<{ success?: boolean; deleted?: number; error?: string }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('read', true)
        .lt('created_at', cutoffDate.toISOString())
        .select();

      if (error) {
        return { error: error.message };
      }

      return { success: true, deleted: data?.length || 0 };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Delete orphaned records
   */
  static async deleteOrphanedRecords(tableName: string): Promise<{ success?: boolean; deleted?: number; error?: string }> {
    try {
      let deleted = 0;

      if (tableName === 'notifications') {
        // Delete notifications with invalid user_id
        const { data, error } = await supabase
          .from('notifications')
          .delete()
          .not('user_id', 'in', `(SELECT id FROM auth.users)`)
          .select();

        if (error) {
          return { error: error.message };
        }
        deleted = data?.length || 0;
      } else if (tableName === 'event_registrations') {
        // Delete registrations with invalid user_id or event_id
        const { data, error } = await supabase
          .from('event_registrations')
          .delete()
          .or('user_id.not.in.(SELECT id FROM auth.users),event_id.not.in.(SELECT id FROM events)')
          .select();

        if (error) {
          return { error: error.message };
        }
        deleted = data?.length || 0;
      } else if (tableName === 'survey_responses') {
        // Delete survey responses with invalid survey_id
        const { data, error } = await supabase
          .from('survey_responses')
          .delete()
          .not('survey_id', 'in', `(SELECT id FROM surveys)`)
          .select();

        if (error) {
          return { error: error.message };
        }
        deleted = data?.length || 0;
      } else {
        return { error: 'Unsupported table for orphaned record cleanup' };
      }

      return { success: true, deleted };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get system health status
   */
  static async getSystemHealth(): Promise<{ health?: SystemHealth; error?: string }> {
    try {
      const issues: string[] = [];
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Check database connectivity
      const { error: dbError } = await supabase.from('events').select('id').limit(1);
      if (dbError) {
        issues.push('Database connection issues detected');
        status = 'critical';
      }

      // Check for orphaned records
      const orphanedResult = await this.getOrphanedRecords();
      if (orphanedResult.records && orphanedResult.records.length > 0) {
        const totalOrphaned = orphanedResult.records.reduce((sum, r) => sum + r.count, 0);
        if (totalOrphaned > 100) {
          issues.push(`High number of orphaned records detected: ${totalOrphaned}`);
          status = status === 'healthy' ? 'warning' : status;
        }
      }

      // Check activity logs table size
      try {
        const { count: activityLogsCount } = await supabase
          .from('activity_logs')
          .select('*', { count: 'exact', head: true });

        if (activityLogsCount && activityLogsCount > 100000) {
          issues.push(`Large activity logs table: ${activityLogsCount} records. Consider cleanup.`);
          status = status === 'healthy' ? 'warning' : status;
        }
      } catch (e) {
        // Activity logs table might not exist, ignore
      }

      // Check notifications table size
      try {
        const { count: notificationsCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true });

        if (notificationsCount && notificationsCount > 50000) {
          issues.push(`Large notifications table: ${notificationsCount} records. Consider cleanup.`);
          status = status === 'healthy' ? 'warning' : status;
        }
      } catch (e) {
        // Ignore
      }

      return {
        health: {
          database_status: status,
          connection_pool: {
            active: 0, // Supabase doesn't expose this directly
            idle: 0,
            total: 0
          },
          storage_usage: {
            used_mb: 0, // Would need RPC function to get actual storage
            available_mb: 0,
            percentage: 0
          },
          issues
        }
      };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}

