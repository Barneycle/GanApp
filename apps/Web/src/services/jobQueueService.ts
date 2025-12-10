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
        return { error: error.message };
      }

      if (!data || data.length === 0) {
        return {}; // No jobs available
      }

      return { job: data[0] as JobData };
    } catch (err: any) {
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
      const { data, error } = await supabase.rpc('complete_job', {
        p_job_id: jobId,
        p_result_data: resultData || null
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (err: any) {
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
      const { data, error } = await supabase.rpc('fail_job', {
        p_job_id: jobId,
        p_error_message: errorMessage
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { error: err.message || 'Failed to fail job' };
    }
  }

  /**
   * Get job status
   */
  static async getJobStatus(jobId: string): Promise<{ job?: JobData; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('job_queue')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        return { error: error.message };
      }

      return { job: data as JobData };
    } catch (err: any) {
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

