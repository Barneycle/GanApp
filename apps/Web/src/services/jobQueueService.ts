/**
 * Job Queue Service
 * Handles background job processing for heavy operations
 */

import { supabase } from '../lib/supabaseClient';

export interface JobData {
  id?: string;
  job_type: string;
  job_data: Record<string, any>;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  priority?: number;
  created_by?: string;
  created_at?: string;
  result_data?: Record<string, any>;
  error_message?: string;
}

export interface CertificateGenerationJobData {
  eventId: string;
  userId: string;
  participantName: string;
  eventTitle: string;
  completionDate: string;
  config?: any; // Optional: for standalone certificates without event
}

export class JobQueueService {
  /**
   * Add a job to the queue
   */
  static async addJob(
    jobType: string,
    jobData: Record<string, any>,
    userId: string,
    priority: number = 5
  ): Promise<{ job?: JobData; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('job_queue')
        .insert({
          job_type: jobType,
          job_data: jobData,
          created_by: userId,
          priority: priority,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { job: data as JobData };
    } catch (err: any) {
      return { error: err.message || 'Failed to add job to queue' };
    }
  }

  /**
   * Get next pending job (for worker)
   */
  static async getNextJob(): Promise<{ job?: JobData; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('get_next_job');

      if (error) {
        console.error('[JobQueueService] get_next_job RPC error:', error);
        return { error: error.message };
      }

      if (!data || data.length === 0) {
        return {}; // No jobs available
      }

      const jobData = data[0] as JobData;
      console.log('[JobQueueService] Got job:', { id: jobData.id, type: jobData.job_type });
      
      // Ensure ID is present
      if (!jobData.id) {
        console.error('[JobQueueService] Job missing ID:', jobData);
        return { error: 'Job missing ID field' };
      }

      return { job: jobData };
    } catch (err: any) {
      console.error('[JobQueueService] Exception in getNextJob:', err);
      return { error: err.message || 'Failed to get next job' };
    }
  }

  /**
   * Mark job as completed
   */
  static async completeJob(
    jobId: string,
    resultData?: Record<string, any>
  ): Promise<{ success?: boolean; error?: string }> {
    try {
      console.log('[JobQueueService] Completing job:', jobId);
      
      // Try RPC first
      const { data, error } = await supabase.rpc('complete_job', {
        p_job_id: jobId,
        p_result_data: resultData || null
      });

      if (error) {
        console.error('[JobQueueService] complete_job RPC error:', error);
        // Fallback to direct update
        console.log('[JobQueueService] Falling back to direct update...');
        const { error: updateError } = await supabase
          .from('job_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result_data: resultData || null
          })
          .eq('id', jobId);

        if (updateError) {
          return { error: `RPC failed: ${error.message}, Direct update failed: ${updateError.message}` };
        }
        console.log('[JobQueueService] Direct update succeeded');
        return { success: true };
      }

      console.log('[JobQueueService] Job completed via RPC');
      return { success: true };
    } catch (err: any) {
      console.error('[JobQueueService] Exception in completeJob:', err);
      return { error: err.message || 'Failed to complete job' };
    }
  }

  /**
   * Mark job as failed
   */
  static async failJob(
    jobId: string,
    errorMessage: string
  ): Promise<{ success?: boolean; error?: string }> {
    try {
      console.log('[JobQueueService] Failing job:', jobId, errorMessage);
      
      // Try RPC first
      const { data, error } = await supabase.rpc('fail_job', {
        p_job_id: jobId,
        p_error_message: errorMessage
      });

      if (error) {
        console.error('[JobQueueService] fail_job RPC error:', error);
        // Fallback to direct update
        console.log('[JobQueueService] Falling back to direct update...');
        const { error: updateError } = await supabase
          .from('job_queue')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);

        if (updateError) {
          return { error: `RPC failed: ${error.message}, Direct update failed: ${updateError.message}` };
        }
        console.log('[JobQueueService] Direct update succeeded');
        return { success: true };
      }

      console.log('[JobQueueService] Job failed via RPC');
      return { success: true };
    } catch (err: any) {
      console.error('[JobQueueService] Exception in failJob:', err);
      return { error: err.message || 'Failed to fail job' };
    }
  }

  /**
   * Get job status
   * Uses RPC function first (bypasses RLS issues), falls back to direct query
   */
  static async getJobStatus(jobId: string): Promise<{ job?: JobData; error?: string }> {
    try {
      // Try RPC function first (more reliable, bypasses RLS)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_job_status', {
        p_job_id: jobId
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        return { job: rpcData[0] as JobData };
      }

      // Fallback to direct query
      const { data, error } = await supabase
        .from('job_queue')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('[JobQueueService] getJobStatus error:', error);
        return { error: error.message };
      }

      return { job: data as JobData };
    } catch (err: any) {
      console.error('[JobQueueService] Exception in getJobStatus:', err);
      return { error: err.message || 'Failed to get job status' };
    }
  }

  /**
   * Get user's jobs
   */
  static async getUserJobs(
    userId: string,
    status?: string
  ): Promise<{ jobs?: JobData[]; error?: string }> {
    try {
      let query = supabase
        .from('job_queue')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        return { error: error.message };
      }

      return { jobs: data as JobData[] };
    } catch (err: any) {
      return { error: err.message || 'Failed to get user jobs' };
    }
  }

  /**
   * Add certificate generation job
   */
  static async queueCertificateGeneration(
    jobData: CertificateGenerationJobData,
    userId: string,
    priority: number = 5
  ): Promise<{ job?: JobData; error?: string }> {
    return this.addJob('certificate_generation', jobData, userId, priority);
  }
}

