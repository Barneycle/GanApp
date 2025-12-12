/**
 * Certificate Job Processor
 * Processes certificate generation jobs from the queue
 * This should run as a background worker or be called periodically
 */

import { CertificateService } from './certificateService';
import { JobQueueService, CertificateGenerationJobData } from './jobQueueService';
import { generatePDFCertificate, generatePNGCertificate, CertificateData } from '../utils/certificateGenerator';
import { supabase } from '../lib/supabaseClient';

/**
 * Generate a deterministic UUID for a participant based on their name and event
 * This allows multiple certificates for the same organizer on the same event
 */
function generateParticipantUserId(participantName: string, eventId: string): string {
  // Create a deterministic UUID v5-like hash from participant name + event ID
  // This ensures each participant gets a unique but consistent user_id
  const input = `${eventId}-${participantName.toLowerCase().trim()}`;
  
  // Simple hash function to generate a UUID-like string
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to a UUID-like format (not a real UUID, but unique enough for our purposes)
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const uuid = `00000000-0000-4000-8000-${hex.padStart(12, '0')}`;
  return uuid;
}

export class CertificateJobProcessor {
  /**
   * Process a certificate generation job
   */
  static async processCertificateJob(jobData: CertificateGenerationJobData): Promise<{
    success: boolean;
    certificateNumber?: string;
    pdfUrl?: string;
    pngUrl?: string;
    error?: string;
  }> {
    try {
      console.log('[Job Processor] Starting certificate generation job:', {
        eventId: jobData.eventId,
        participantName: jobData.participantName,
        eventTitle: jobData.eventTitle
      });

      const { eventId, userId, participantName, eventTitle, completionDate, config: providedConfig } = jobData;

      // Get certificate config
      let config;
      if (providedConfig) {
        // Use provided config for standalone certificates
        config = providedConfig;
        console.log('[Job Processor] Using provided config for standalone certificate');
      } else {
        // Get config from database for event-based certificates
        console.log('[Job Processor] Fetching config from database for event:', eventId);
        const configResult = await CertificateService.getCertificateConfig(eventId);
        if (configResult.error || !configResult.config) {
          const errorMsg = configResult.error || 'Certificate config not found';
          console.error('[Job Processor] Failed to get config:', errorMsg);
          return {
            success: false,
            error: errorMsg
          };
        }
        config = configResult.config;
        console.log('[Job Processor] Config loaded successfully');
      }

      // Get certificate number
      let certificateNumber: string;
      if (config.cert_id_prefix) {
        // For standalone certificates, use a simple counter
        if (eventId === 'standalone') {
          // Generate a simple number for standalone
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 1000);
          certificateNumber = `${config.cert_id_prefix}-${String(random).padStart(3, '0')}`;
        } else {
          const countResult = await CertificateService.getCurrentCertificateCount(eventId);
          if (countResult.error) {
            return {
              success: false,
              error: `Failed to get certificate count: ${countResult.error}`
            };
          }
          const nextCount = (countResult.count || 0) + 1;
          const formattedNumber = String(nextCount).padStart(3, '0');
          certificateNumber = `${config.cert_id_prefix}-${formattedNumber}`;
        }
      } else {
        certificateNumber = CertificateService.generateCertificateNumber(eventId, userId);
      }

      // Generate PDF and PNG using shared certificate generator
      console.log('[Job Processor] Generating PDF and PNG files...');
      let pdfBytes, pngBlob;
      
      // Prepare certificate data
      const certificateData: CertificateData = {
        participantName,
        eventTitle,
        completionDate,
        venue: undefined // Venue not available in job data, but can be added if needed
      };
      
      try {
        pdfBytes = await generatePDFCertificate(config, certificateNumber, certificateData);
        console.log('[Job Processor] PDF generated:', pdfBytes ? `${pdfBytes.length} bytes` : 'FAILED');
      } catch (pdfError: any) {
        console.error('[Job Processor] PDF generation error:', pdfError);
        return {
          success: false,
          error: `PDF generation failed: ${pdfError.message || 'Unknown error'}`
        };
      }

      try {
        pngBlob = await generatePNGCertificate(config, certificateNumber, certificateData);
        console.log('[Job Processor] PNG generated:', pngBlob ? `${pngBlob.size} bytes` : 'FAILED');
      } catch (pngError: any) {
        console.error('[Job Processor] PNG generation error:', pngError);
        return {
          success: false,
          error: `PNG generation failed: ${pngError.message || 'Unknown error'}`
        };
      }

      if (!pdfBytes || !pngBlob) {
        const errorMsg = `Failed to generate certificate files: PDF=${!!pdfBytes}, PNG=${!!pngBlob}`;
        console.error('[Job Processor]', errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }

      // Upload files
      console.log('[Job Processor] Uploading certificate files...');
      const pdfFileName = `${certificateNumber}.pdf`;
      const pngFileName = `${certificateNumber}.png`;
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      let pdfResult, pngResult;
      try {
        [pdfResult, pngResult] = await Promise.all([
          CertificateService.uploadCertificateFile(pdfBlob, pdfFileName, 'pdf', eventId, userId),
          CertificateService.uploadCertificateFile(pngBlob, pngFileName, 'png', eventId, userId)
        ]);
        console.log('[Job Processor] Upload results - PDF:', pdfResult.error ? 'FAILED' : 'SUCCESS', 'PNG:', pngResult.error ? 'FAILED' : 'SUCCESS');
      } catch (uploadError: any) {
        console.error('[Job Processor] Upload error:', uploadError);
        return {
          success: false,
          error: `Upload failed: ${uploadError.message || 'Unknown error'}`
        };
      }

      if (pdfResult.error || pngResult.error) {
        const errorMsg = pdfResult.error || pngResult.error || 'Failed to upload certificate files';
        console.error('[Job Processor] Upload failed:', errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }

      // Increment certificate counter (skip for standalone)
      if (eventId !== 'standalone') {
        const incrementResult = await CertificateService.incrementCertificateCounter(eventId);
        if (incrementResult.error) {
          console.warn('Failed to increment certificate counter:', incrementResult.error);
          // Don't fail the job if counter increment fails
        }
      }

      // Get certificate template ID for this event
      // If an event is selected (not 'standalone'), get its template ID
      // If no event is selected, create a template for standalone certificates
      let templateId: string | undefined;
      let actualEventId: string | null = null;
      
      if (eventId !== 'standalone') {
        // Event is selected - use the event's template
        actualEventId = eventId;
        const { data: templates, error: templateError } = await supabase
          .from('certificate_templates')
          .select('id')
          .eq('event_id', eventId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

        if (templateError) {
          console.error('[Job Processor] Error fetching template:', templateError);
          // Continue anyway - saveCertificate will try to find one
        } else if (templates) {
          templateId = templates.id;
          console.log('[Job Processor] Found template ID:', templateId);
        } else {
          console.warn('[Job Processor] No certificate template found for event:', eventId);
          // Continue anyway - saveCertificate will try to find one
        }
      } else {
        // True standalone (no event selected) - create a template for it
        console.log('[Job Processor] Standalone certificate - creating template');
        const createTemplateResult = await CertificateService.createStandaloneTemplate(userId, eventTitle);
        if (createTemplateResult.error || !createTemplateResult.templateId) {
          console.error('[Job Processor] Failed to create standalone template:', createTemplateResult.error);
          return {
            success: false,
            error: `Failed to create certificate template: ${createTemplateResult.error || 'Unknown error'}`
          };
        }
        templateId = createTemplateResult.templateId;
        actualEventId = createTemplateResult.eventId || null;
      }

      // Determine the user_id to use for the certificate
      // For standalone certificates, use a deterministic UUID based on participant name
      // For event-based certificates, use the actual userId (from job data) to satisfy RLS policies
      let certificateUserId = userId;
      
      // Only generate a deterministic user_id for standalone certificates
      // For event-based certificates, use the authenticated user's ID (userId from job)
      // This satisfies RLS policy: user_id = auth.uid()
      if (eventId === 'standalone') {
        // Generate deterministic user_id for standalone certificates
        certificateUserId = generateParticipantUserId(participantName, eventId);
        console.log('[Job Processor] Using participant-specific user_id for standalone certificate:', certificateUserId);
      } else {
        // For event-based certificates, use the authenticated user's ID
        // This allows participants to generate their own certificates (satisfies RLS: user_id = auth.uid())
        certificateUserId = userId;
        console.log('[Job Processor] Using authenticated user_id for event certificate:', certificateUserId);
      }

      // Save to database
      console.log('[Job Processor] Saving certificate to database with:', {
        event_id: actualEventId,
        template_id: templateId,
        certificate_number: certificateNumber,
        user_id: certificateUserId
      });
      
      const saveResult = await CertificateService.saveCertificate({
        event_id: actualEventId,
        user_id: certificateUserId, // Use participant-specific user_id for standalone certs
        certificate_number: certificateNumber,
        participant_name: participantName,
        event_title: eventTitle,
        completion_date: completionDate,
        certificate_pdf_url: pdfResult.url,
        certificate_png_url: pngResult.url,
        certificate_template_id: templateId
      });

      if (saveResult.error) {
        console.error('[Job Processor] Failed to save certificate:', saveResult.error);
        console.error('[Job Processor] Save result details:', saveResult);
        return {
          success: false,
          error: `Failed to save certificate: ${saveResult.error}`
        };
      }

      if (!saveResult.certificate) {
        console.error('[Job Processor] Certificate save returned no certificate object');
        return {
          success: false,
          error: 'Certificate save completed but no certificate was returned'
        };
      }

      console.log('[Job Processor] Certificate saved successfully with ID:', saveResult.certificate.id);

      console.log('[Job Processor] Certificate generation completed successfully:', {
        certificateNumber,
        pdfUrl: pdfResult.url,
        pngUrl: pngResult.url
      });

      return {
        success: true,
        certificateNumber,
        pdfUrl: pdfResult.url,
        pngUrl: pngResult.url
      };
    } catch (error: any) {
      console.error('[Job Processor] Unexpected error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process certificate job'
      };
    }
  }


  /**
   * Process all pending certificate jobs (worker function)
   * This should be called periodically or run as a background worker
   */
  static async processPendingJobs(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    // Process up to 10 jobs at a time
    for (let i = 0; i < 10; i++) {
      const jobResult = await JobQueueService.getNextJob();
      
      if (jobResult.error || !jobResult.job) {
        break; // No more jobs
      }

      const job = jobResult.job;
      
      // Ensure job has an ID
      if (!job.id) {
        console.error('[Job Processor] Job missing ID:', job);
        failed++;
        continue;
      }
      
      processed++;
      const jobId = job.id;

      try {
        if (job.job_type === 'certificate_generation') {
          console.log(`[Job Processor] Processing job ${jobId}...`);
          const result = await this.processCertificateJob(
            job.job_data as CertificateGenerationJobData
          );

          if (result.success) {
            console.log(`[Job Processor] Job ${jobId} completed successfully`);
            const completeResult = await JobQueueService.completeJob(jobId, {
              certificateNumber: result.certificateNumber,
              pdfUrl: result.pdfUrl,
              pngUrl: result.pngUrl
            });
            
            if (completeResult.error) {
              console.error(`[Job Processor] Failed to mark job ${jobId} as complete:`, completeResult.error);
              // Try direct update as fallback
              await this.updateJobStatusDirectly(jobId, 'completed', {
                certificateNumber: result.certificateNumber,
                pdfUrl: result.pdfUrl,
                pngUrl: result.pngUrl
              });
            }
            succeeded++;
          } else {
            console.error(`[Job Processor] Job ${jobId} failed:`, result.error);
            const failResult = await JobQueueService.failJob(jobId, result.error || 'Unknown error');
            if (failResult.error) {
              console.error(`[Job Processor] Failed to mark job ${jobId} as failed:`, failResult.error);
              await this.updateJobStatusDirectly(jobId, 'failed', null, result.error || 'Unknown error');
            }
            failed++;
          }
        } else {
          console.error(`[Job Processor] Unknown job type: ${job.job_type}`);
          const failResult = await JobQueueService.failJob(jobId, `Unknown job type: ${job.job_type}`);
          if (failResult.error) {
            await this.updateJobStatusDirectly(jobId, 'failed', null, `Unknown job type: ${job.job_type}`);
          }
          failed++;
        }
      } catch (error: any) {
        console.error(`[Job Processor] Exception processing job ${jobId}:`, error);
        const failResult = await JobQueueService.failJob(jobId, error.message || 'Processing error');
        if (failResult.error) {
          await this.updateJobStatusDirectly(jobId, 'failed', null, error.message || 'Processing error');
        }
        failed++;
      }
    }

    return { processed, succeeded, failed };
  }

  /**
   * Fallback method to update job status directly if RPC fails
   */
  private static async updateJobStatusDirectly(
    jobId: string,
    status: 'completed' | 'failed',
    resultData?: Record<string, any> | null,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { supabase } = await import('../lib/supabaseClient');
      const updateData: any = {
        status,
        completed_at: new Date().toISOString()
      };
      
      if (status === 'completed' && resultData) {
        updateData.result_data = resultData;
      }
      
      if (status === 'failed' && errorMessage) {
        updateData.error_message = errorMessage;
      }
      
      const { error } = await supabase
        .from('job_queue')
        .update(updateData)
        .eq('id', jobId);
      
      if (error) {
        console.error(`[Job Processor] Direct update failed for job ${jobId}:`, error);
      } else {
        console.log(`[Job Processor] Direct update succeeded for job ${jobId}`);
      }
    } catch (err: any) {
      console.error(`[Job Processor] Exception in direct update for job ${jobId}:`, err);
    }
  }
}

