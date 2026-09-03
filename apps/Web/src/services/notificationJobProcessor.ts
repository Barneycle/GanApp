/**
 * Notification Job Processor
 * Processes notification jobs from the queue
 */

import { JobQueueService } from './jobQueueService';
import { supabase } from '../lib/supabaseClient';
import { logActivity } from '../utils/activityLogger';
import { LoggerService } from './loggerService';

export interface BulkNotificationJobData {
  userIds: string[];
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  options?: {
    action_url?: string;
    action_text?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    expires_at?: string;
  };
  createdBy: string;
}

export interface SingleNotificationJobData {
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  options?: {
    action_url?: string;
    action_text?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    expires_at?: string;
  };
  createdBy?: string;
}

export class NotificationJobProcessor {
  /**
   * Process a bulk notification job
   */
  static async processBulkNotificationJob(jobData: BulkNotificationJobData): Promise<{
    success: boolean;
    sent?: number;
    error?: string;
  }> {
    try {
      LoggerService.serviceLog('Notification Job Processor', 'Starting bulk notification job', {
        userIdsCount: jobData.userIds.length,
        title: jobData.title
      });

      const notifications = jobData.userIds.map(userId => ({
        user_id: userId,
        title: jobData.title,
        message: jobData.message,
        type: jobData.type,
        action_url: jobData.options?.action_url,
        action_text: jobData.options?.action_text,
        priority: jobData.options?.priority || 'normal',
        expires_at: jobData.options?.expires_at,
        read: false
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) {
        LoggerService.serviceError('Notification Job Processor', 'Failed to insert notifications', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Log activity
      if (jobData.createdBy) {
        logActivity(
          jobData.createdBy,
          'create',
          'notification',
          {
            resourceId: 'bulk',
            resourceName: `Bulk notification: ${jobData.title}`,
            details: {
              user_ids_count: jobData.userIds.length,
              type: jobData.type,
              title: jobData.title,
              sent: data?.length || 0
            }
          }
        ).catch(err => LoggerService.serviceError('Notification Job Processor', 'Failed to log bulk notification', err));
      }

      LoggerService.serviceLog('Notification Job Processor', 'Bulk notification job completed successfully', {
        sent: data?.length || 0
      });

      return {
        success: true,
        sent: data?.length || 0
      };
    } catch (error: any) {
      LoggerService.serviceError('Notification Job Processor', 'Exception in processBulkNotificationJob', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred'
      };
    }
  }

  /**
   * Process a single notification job
   */
  static async processSingleNotificationJob(jobData: SingleNotificationJobData): Promise<{
    success: boolean;
    notificationId?: string;
    error?: string;
  }> {
    try {
      LoggerService.serviceLog('Notification Job Processor', 'Starting single notification job', {
        userId: jobData.userId,
        title: jobData.title
      });

      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: jobData.userId,
          title: jobData.title,
          message: jobData.message,
          type: jobData.type,
          action_url: jobData.options?.action_url,
          action_text: jobData.options?.action_text,
          priority: jobData.options?.priority || 'normal',
          expires_at: jobData.options?.expires_at,
          read: false
        }])
        .select()
        .single();

      if (error) {
        LoggerService.serviceError('Notification Job Processor', 'Failed to insert notification', error);
        return {
          success: false,
          error: error.message
        };
      }

      LoggerService.serviceLog('Notification Job Processor', 'Single notification job completed successfully', {
        notificationId: data?.id
      });

      return {
        success: true,
        notificationId: data?.id
      };
    } catch (error: any) {
      LoggerService.serviceError('Notification Job Processor', 'Exception in processSingleNotificationJob', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred'
      };
    }
  }

  /**
   * Process all pending notification jobs
   */
  static async processPendingJobs(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      // Process up to 10 jobs at a time
      for (let i = 0; i < 10; i++) {
        const { job, error: getJobError } = await JobQueueService.getNextJob();

        if (getJobError || !job) {
          break; // No more jobs available
        }

        const jobId = job.id!;

        try {
          if (job.job_type === 'bulk_notification') {
            LoggerService.serviceLog('Notification Job Processor', `Processing bulk notification job ${jobId}...`);
            const result = await this.processBulkNotificationJob(
              job.job_data as BulkNotificationJobData
            );

            if (result.success) {
              LoggerService.serviceLog('Notification Job Processor', `Bulk notification job ${jobId} completed successfully`);
              const completeResult = await JobQueueService.completeJob(jobId, {
                sent: result.sent
              });

              if (completeResult.error) {
                LoggerService.serviceError('Notification Job Processor', `Failed to mark job ${jobId} as complete`, completeResult.error);
              }
              succeeded++;
            } else {
              LoggerService.serviceError('Notification Job Processor', `Bulk notification job ${jobId} failed`, undefined, { error: result.error });
              const failResult = await JobQueueService.failJob(jobId, result.error || 'Unknown error');
              if (failResult.error) {
                LoggerService.serviceError('Notification Job Processor', `Failed to mark job ${jobId} as failed`, failResult.error);
              }
              failed++;
            }
          } else if (job.job_type === 'single_notification') {
            LoggerService.serviceLog('Notification Job Processor', `Processing single notification job ${jobId}...`);
            const result = await this.processSingleNotificationJob(
              job.job_data as SingleNotificationJobData
            );

            if (result.success) {
              LoggerService.serviceLog('Notification Job Processor', `Single notification job ${jobId} completed successfully`);
              const completeResult = await JobQueueService.completeJob(jobId, {
                notificationId: result.notificationId
              });

              if (completeResult.error) {
                LoggerService.serviceError('Notification Job Processor', `Failed to mark job ${jobId} as complete`, completeResult.error);
              }
              succeeded++;
            } else {
              LoggerService.serviceError('Notification Job Processor', `Single notification job ${jobId} failed`, undefined, { error: result.error });
              const failResult = await JobQueueService.failJob(jobId, result.error || 'Unknown error');
              if (failResult.error) {
                LoggerService.serviceError('Notification Job Processor', `Failed to mark job ${jobId} as failed`, failResult.error);
              }
              failed++;
            }
          } else {
            // Not a notification job, skip it
            continue;
          }
        } catch (error: any) {
          LoggerService.serviceError('Notification Job Processor', `Exception processing job ${jobId}`, error);
          const failResult = await JobQueueService.failJob(jobId, error.message || 'Processing error');
          if (failResult.error) {
            LoggerService.serviceError('Notification Job Processor', `Failed to mark job ${jobId} as failed`, failResult.error);
          }
          failed++;
        }

        processed++;
      }

      if (processed > 0) {
        LoggerService.serviceLog('Notification Job Processor', `Processed ${processed} jobs: ${succeeded} succeeded, ${failed} failed`);
      }
    } catch (error: any) {
      LoggerService.serviceError('Notification Job Processor', 'Exception in processPendingJobs', error);
    }

    return { processed, succeeded, failed };
  }
}
