/**
 * Certificate Job Processor
 * Processes certificate generation jobs from the queue
 * This should run as a background worker or be called periodically
 */

import { CertificateService } from './certificateService';
import { EventService } from './eventService';
import { JobQueueService, CertificateGenerationJobData } from './jobQueueService';
import { NotificationJobProcessor } from './notificationJobProcessor';
import { generatePNGCertificate, convertPNGToPDF, CertificateData } from '../utils/certificateGenerator';
import { supabase } from '../lib/supabaseClient';
import { LoggerService } from './loggerService';

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
      LoggerService.serviceLog('CertificateJobProcessor', 'Starting certificate generation job', {
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
        LoggerService.serviceLog('CertificateJobProcessor', 'Using provided config for standalone certificate');
      } else {
        // Get config from database for event-based certificates
        LoggerService.serviceLog('CertificateJobProcessor', 'Fetching config from database for event', { eventId });
        const configResult = await CertificateService.getCertificateConfig(eventId);
        if (configResult.error || !configResult.config) {
          const errorMsg = configResult.error || 'Certificate config not found';
          LoggerService.serviceError('CertificateJobProcessor', 'Failed to get config', undefined, { errorMsg });
          return {
            success: false,
            error: errorMsg
          };
        }
        config = configResult.config;
        LoggerService.serviceLog('CertificateJobProcessor', 'Config loaded successfully');
      }

      // Determine actualEventId and certificateUserId early to check for existing certificates BEFORE generating files
      let templateId: string | undefined;
      let actualEventId: string | null = null;
      let certificateUserId = userId;

      // Determine the user_id to use for the certificate
      // For standalone certificates, use a deterministic UUID based on participant name
      // For event-based certificates, use the actual userId (from job data) to satisfy RLS policies
      if (eventId === 'standalone') {
        // Generate deterministic user_id for standalone certificates
        certificateUserId = generateParticipantUserId(participantName, eventId);
        LoggerService.serviceLog('CertificateJobProcessor', 'Using participant-specific user_id for standalone certificate', { certificateUserId });
      } else {
        // For event-based certificates, use the authenticated user's ID
        // This allows participants to generate their own certificates (satisfies RLS: user_id = auth.uid())
        certificateUserId = userId;
        LoggerService.serviceLog('CertificateJobProcessor', 'Using authenticated user_id for event certificate', { certificateUserId });
      }

      // Get certificate template ID for this event
      // If an event is selected (not 'standalone'), get its template ID
      // If no event is selected, create a template for standalone certificates
      if (eventId && eventId !== 'standalone' && typeof eventId === 'string' && eventId.trim() !== '') {
        // Event is selected - use the event's template
        actualEventId = eventId;
        const { data: templates, error: templateError } = await supabase
          .from('certificate_templates')
          .select('id')
          .eq('event_id', eventId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (templateError) {
          LoggerService.serviceError('CertificateJobProcessor', 'Error fetching template', templateError);
          // Continue anyway - saveCertificate will try to find one
        } else if (templates) {
          templateId = templates.id;
          LoggerService.serviceLog('CertificateJobProcessor', 'Found template ID', { templateId });
        } else {
          LoggerService.serviceWarn('CertificateJobProcessor', 'No certificate template found for event', { eventId });
          // Continue anyway - saveCertificate will try to find one
        }
      } else if (eventId === 'standalone') {
        // True standalone (no event selected) - create a template for it
        LoggerService.serviceLog('CertificateJobProcessor', 'Standalone certificate - creating template');
        const createTemplateResult = await CertificateService.createStandaloneTemplate(userId, eventTitle);
        if (createTemplateResult.error || !createTemplateResult.templateId) {
          LoggerService.serviceError('CertificateJobProcessor', 'Failed to create standalone template', undefined, { error: createTemplateResult.error });
          return {
            success: false,
            error: `Failed to create certificate template: ${createTemplateResult.error || 'Unknown error'}`
          };
        }
        templateId = createTemplateResult.templateId;
        actualEventId = createTemplateResult.eventId || null;
      }

      // Check if certificate already exists BEFORE generating files
      // This prevents generating files unnecessarily and ensures certificate numbers remain unique
      if (actualEventId && eventId !== 'standalone' && typeof eventId === 'string' && eventId.trim() !== '') {
        // Priority check: ALWAYS check by participant_name first
        // This works for both manual entries and event participants since participant_name is unique per event
        // Manual entries share organizer's user_id, so checking by user_id alone would incorrectly flag duplicates
        let existingCert = null;

        const trimmedParticipantName = participantName.trim();
        LoggerService.serviceLog('CertificateJobProcessor', 'DUPLICATE CHECK START', {
          participant: trimmedParticipantName,
          event: actualEventId,
          user_id: certificateUserId
        });

        // Check by participant_name ONLY (works for both manual entries and event participants)
        // For manual entries, all participants share organizer's user_id, so user_id check would cause false positives
        const existingCertByName = await CertificateService.getCertificateByParticipantName(trimmedParticipantName, actualEventId);
        if (existingCertByName.error) {
          LoggerService.serviceError('CertificateJobProcessor', 'ERROR checking certificate by participant_name', undefined, { error: existingCertByName.error });
        } else if (existingCertByName.certificate) {
          existingCert = existingCertByName.certificate;
          LoggerService.serviceLog('CertificateJobProcessor', 'DUPLICATE FOUND by participant_name', {
            id: existingCert.id,
            certificate_number: existingCert.certificate_number,
            participant_name_in_db: existingCert.participant_name,
            searching_for: trimmedParticipantName,
            names_match: existingCert.participant_name === trimmedParticipantName,
            user_id: existingCert.user_id
          });
        } else {
          LoggerService.serviceLog('CertificateJobProcessor', 'NO DUPLICATE - No certificate found by participant_name', { participant: trimmedParticipantName });
        }

        // For manual entries: skip user_id check entirely since all manual entries share organizer's user_id
        // Only check by user_id for actual event participants (registered users with their own accounts)
        // We can detect manual entries by checking if the userId passed in matches what would be used for a registered participant
        // For now, ONLY check by participant_name - this is the most reliable way to detect duplicates
        // The user_id check was causing false positives for manual entries

        // REMOVED: user_id check causes issues for manual entries since they all share the same user_id
        // Only participant_name check is sufficient and correct

        if (existingCert) {
          LoggerService.serviceLog('CertificateJobProcessor', 'Certificate already exists for this participant and event. Skipping generation to preserve certificate number uniqueness', { certificateId: existingCert.id });
          LoggerService.serviceLog('CertificateJobProcessor', 'Counter will NOT increment for duplicate certificates (this is correct behavior)');
          return {
            success: false,
            error: `Certificate already exists for this participant. Certificate number: ${existingCert.certificate_number}. Cannot create duplicate certificate.`
          };
        }
        LoggerService.serviceLog('CertificateJobProcessor', 'No existing certificate found - proceeding with new certificate generation');
      }

      // Get certificate number (only if certificate doesn't exist)
      let certificateNumber: string;
      if (config.cert_id_prefix) {
        // For standalone certificates, use a simple counter
        if (eventId === 'standalone') {
          // Generate a simple number for standalone
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 1000);
          certificateNumber = `${config.cert_id_prefix}-${String(random).padStart(3, '0')}`;
        } else {
          // For event-based certificates, get current count first (without incrementing)
          // We'll increment only after successful certificate save
          const eventIdForCounter = actualEventId || eventId;
          LoggerService.serviceLog('CertificateJobProcessor', 'Getting current certificate count for event', { eventId: eventIdForCounter });
          const countResult = await CertificateService.getCurrentCertificateCount(eventIdForCounter);
          if (countResult.error) {
            LoggerService.serviceError('CertificateJobProcessor', 'Failed to get certificate count', undefined, { error: countResult.error });
            return {
              success: false,
              error: `Failed to get certificate count: ${countResult.error}`
            };
          }
          const currentCount = countResult.count || 0;
          const nextCount = currentCount + 1;
          const formattedNumber = String(nextCount).padStart(3, '0');
          certificateNumber = `${config.cert_id_prefix}-${formattedNumber}`;
          LoggerService.serviceLog('CertificateJobProcessor', 'Certificate number calculation', {
            currentCount,
            nextCount,
            certificateNumber
          });
        }
      } else {
        certificateNumber = CertificateService.generateCertificateNumber(eventId, userId);
      }

      // Get event venue if eventId is available (not standalone)
      let venue: string | undefined = undefined;
      if (eventId && eventId !== 'standalone') {
        try {
          const eventResult = await EventService.getEventById(eventId);
          if (eventResult.event && eventResult.event.venue) {
            venue = eventResult.event.venue;
            LoggerService.serviceLog('CertificateJobProcessor', 'Found venue', { venue });
          }
        } catch (venueError) {
          LoggerService.serviceWarn('CertificateJobProcessor', 'Could not fetch event venue', { error: venueError });
          // Continue without venue - will use fallback
        }
      }

      // Generate PNG first, then convert to PDF
      LoggerService.serviceLog('CertificateJobProcessor', 'Generating PNG certificate');
      let pdfBytes, pngBlob;

      // Prepare certificate data
      const certificateData: CertificateData = {
        participantName,
        eventTitle,
        completionDate,
        venue: venue || '' // Use fetched venue or empty string
      };

      try {
        // First, generate the PNG certificate
        pngBlob = await generatePNGCertificate(config, certificateNumber, certificateData);
        LoggerService.serviceLog('CertificateJobProcessor', 'PNG generated', { size: pngBlob ? `${pngBlob.size} bytes` : 'FAILED' });

        if (!pngBlob) {
          throw new Error('PNG generation returned null');
        }
      } catch (pngError: any) {
        LoggerService.serviceError('CertificateJobProcessor', 'PNG generation error', pngError);
        return {
          success: false,
          error: `PNG generation failed: ${pngError.message || 'Unknown error'}`
        };
      }

      try {
        // Convert PNG to PDF
        LoggerService.serviceLog('CertificateJobProcessor', 'Converting PNG to PDF');
        const width = config.width || 842;  // A4 landscape width in points
        const height = config.height || 595; // A4 landscape height in points
        pdfBytes = await convertPNGToPDF(pngBlob, width, height);
        LoggerService.serviceLog('CertificateJobProcessor', 'PDF generated', { size: pdfBytes ? `${pdfBytes.length} bytes` : 'FAILED' });
      } catch (pdfError: any) {
        LoggerService.serviceError('CertificateJobProcessor', 'PDF conversion error', pdfError);
        return {
          success: false,
          error: `PDF generation failed: ${pdfError.message || 'Unknown error'}`
        };
      }

      if (!pdfBytes || !pngBlob) {
        const errorMsg = `Failed to generate certificate files: PDF=${!!pdfBytes}, PNG=${!!pngBlob}`;
        LoggerService.serviceError('CertificateJobProcessor', errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }

      // Upload files
      LoggerService.serviceLog('CertificateJobProcessor', 'Uploading certificate files');
      const pdfFileName = `${certificateNumber}.pdf`;
      const pngFileName = `${certificateNumber}.png`;
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      let pdfResult, pngResult;
      try {
        [pdfResult, pngResult] = await Promise.all([
          CertificateService.uploadCertificateFile(pdfBlob, pdfFileName, 'pdf', eventId, userId),
          CertificateService.uploadCertificateFile(pngBlob, pngFileName, 'png', eventId, userId)
        ]);
        LoggerService.serviceLog('CertificateJobProcessor', 'Upload results', {
          pdf: pdfResult.error ? 'FAILED' : 'SUCCESS',
          png: pngResult.error ? 'FAILED' : 'SUCCESS'
        });
      } catch (uploadError: any) {
        LoggerService.serviceError('CertificateJobProcessor', 'Upload error', uploadError);
        return {
          success: false,
          error: `Upload failed: ${uploadError.message || 'Unknown error'}`
        };
      }

      if (pdfResult.error || pngResult.error) {
        const errorMsg = pdfResult.error || pngResult.error || 'Failed to upload certificate files';
        LoggerService.serviceError('CertificateJobProcessor', 'Upload failed', undefined, { errorMsg });
        return {
          success: false,
          error: errorMsg
        };
      }

      // Save to database
      LoggerService.serviceLog('CertificateJobProcessor', 'Saving certificate to database', {
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
        LoggerService.serviceError('CertificateJobProcessor', 'Failed to save certificate', undefined, { error: saveResult.error, details: saveResult });
        return {
          success: false,
          error: `Failed to save certificate: ${saveResult.error}`
        };
      }

      if (!saveResult.certificate) {
        LoggerService.serviceError('CertificateJobProcessor', 'Certificate save returned no certificate object');
        return {
          success: false,
          error: 'Certificate save completed but no certificate was returned'
        };
      }

      LoggerService.serviceLog('CertificateJobProcessor', 'Certificate saved successfully', { certificateId: saveResult.certificate.id });

      // Increment certificate counter ONLY after successful save
      // This ensures the counter only increments when a certificate is actually created
      if (eventId !== 'standalone' && actualEventId && config.cert_id_prefix) {
        LoggerService.serviceLog('CertificateJobProcessor', 'Incrementing certificate counter for event', { eventId: actualEventId });
        const incrementResult = await CertificateService.incrementCertificateCounter(actualEventId);
        if (incrementResult.error) {
          LoggerService.serviceWarn('CertificateJobProcessor', 'Failed to increment certificate counter after save', { error: incrementResult.error });
          // Don't fail the job if counter increment fails - certificate was saved successfully
        } else {
          // Verify the counter was incremented
          const verifyResult = await CertificateService.getCurrentCertificateCount(actualEventId);
          LoggerService.serviceLog('CertificateJobProcessor', 'Certificate counter incremented successfully', { count: verifyResult.count || 'unknown' });
        }
      }

      LoggerService.serviceLog('CertificateJobProcessor', 'Certificate generation completed successfully', {
        certificateNumber,
        pdfUrl: pdfResult.url,
        pngUrl: pngResult.url
      });

      // Send notification to user that certificate is ready
      try {
        const { NotificationService } = await import('./notificationService');
        await NotificationService.createNotification(
          userId,
          'Certificate Ready',
          `Your certificate for "${eventTitle}" has been generated successfully. You can now view and download it.`,
          'success',
          {
            action_url: `/certificate?eventId=${eventId}&participantName=${encodeURIComponent(participantName)}`,
            action_text: 'View Certificate',
            priority: 'normal'
          }
        );
      } catch (notifError) {
        LoggerService.serviceError('CertificateJobProcessor', 'Failed to send certificate ready notification', notifError);
        // Don't fail the job if notification fails
      }

      return {
        success: true,
        certificateNumber,
        pdfUrl: pdfResult.url,
        pngUrl: pngResult.url
      };
    } catch (error: any) {
      LoggerService.serviceError('CertificateJobProcessor', 'Unexpected error', error);
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
        LoggerService.serviceError('CertificateJobProcessor', 'Job missing ID', undefined, { job });
        failed++;
        continue;
      }

      processed++;
      const jobId = job.id;

      try {
        if (job.job_type === 'certificate_generation') {
          LoggerService.serviceLog('CertificateJobProcessor', `Processing job ${jobId}`);
          const result = await this.processCertificateJob(
            job.job_data as CertificateGenerationJobData
          );

          if (result.success) {
            LoggerService.serviceLog('CertificateJobProcessor', `Job ${jobId} completed successfully`);
            const completeResult = await JobQueueService.completeJob(jobId, {
              certificateNumber: result.certificateNumber,
              pdfUrl: result.pdfUrl,
              pngUrl: result.pngUrl
            });

            if (completeResult.error) {
              LoggerService.serviceError('CertificateJobProcessor', `Failed to mark job ${jobId} as complete`, undefined, { error: completeResult.error });
              // Try direct update as fallback
              await this.updateJobStatusDirectly(jobId, 'completed', {
                certificateNumber: result.certificateNumber,
                pdfUrl: result.pdfUrl,
                pngUrl: result.pngUrl
              });
            }
            succeeded++;
          } else {
            LoggerService.serviceError('CertificateJobProcessor', `Job ${jobId} failed`, undefined, { error: result.error });
            const failResult = await JobQueueService.failJob(jobId, result.error || 'Unknown error');
            if (failResult.error) {
              LoggerService.serviceError('CertificateJobProcessor', `Failed to mark job ${jobId} as failed`, undefined, { error: failResult.error });
              await this.updateJobStatusDirectly(jobId, 'failed', null, result.error || 'Unknown error');
            }
            failed++;
          }
        } else if (job.job_type === 'bulk_notification') {
          LoggerService.serviceLog('CertificateJobProcessor', `Processing bulk notification job ${jobId}`);
          const result = await NotificationJobProcessor.processBulkNotificationJob(
            job.job_data as any
          );

          if (result.success) {
            LoggerService.serviceLog('CertificateJobProcessor', `Bulk notification job ${jobId} completed successfully`);
            const completeResult = await JobQueueService.completeJob(jobId, {
              sent: result.sent
            });

            if (completeResult.error) {
              LoggerService.serviceError('CertificateJobProcessor', `Failed to mark job ${jobId} as complete`, undefined, { error: completeResult.error });
            }
            succeeded++;
          } else {
            LoggerService.serviceError('CertificateJobProcessor', `Bulk notification job ${jobId} failed`, undefined, { error: result.error });
            const failResult = await JobQueueService.failJob(jobId, result.error || 'Unknown error');
            if (failResult.error) {
              LoggerService.serviceError('CertificateJobProcessor', `Failed to mark job ${jobId} as failed`, undefined, { error: failResult.error });
            }
            failed++;
          }
        } else if (job.job_type === 'single_notification') {
          LoggerService.serviceLog('CertificateJobProcessor', `Processing single notification job ${jobId}`);
          const result = await NotificationJobProcessor.processSingleNotificationJob(
            job.job_data as any
          );

          if (result.success) {
            LoggerService.serviceLog('CertificateJobProcessor', `Single notification job ${jobId} completed successfully`);
            const completeResult = await JobQueueService.completeJob(jobId, {
              notificationId: result.notificationId
            });

            if (completeResult.error) {
              LoggerService.serviceError('CertificateJobProcessor', `Failed to mark job ${jobId} as complete`, undefined, { error: completeResult.error });
            }
            succeeded++;
          } else {
            LoggerService.serviceError('CertificateJobProcessor', `Single notification job ${jobId} failed`, undefined, { error: result.error });
            const failResult = await JobQueueService.failJob(jobId, result.error || 'Unknown error');
            if (failResult.error) {
              LoggerService.serviceError('CertificateJobProcessor', `Failed to mark job ${jobId} as failed`, undefined, { error: failResult.error });
            }
            failed++;
          }
        } else {
          LoggerService.serviceError('CertificateJobProcessor', `Unknown job type: ${job.job_type}`);
          const failResult = await JobQueueService.failJob(jobId, `Unknown job type: ${job.job_type}`);
          if (failResult.error) {
            await this.updateJobStatusDirectly(jobId, 'failed', null, `Unknown job type: ${job.job_type}`);
          }
          failed++;
        }
      } catch (error: any) {
        LoggerService.serviceError('CertificateJobProcessor', `Exception processing job ${jobId}`, error);
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
        LoggerService.serviceError('CertificateJobProcessor', `Direct update failed for job ${jobId}`, error);
      } else {
        LoggerService.serviceLog('CertificateJobProcessor', `Direct update succeeded for job ${jobId}`);
      }
    } catch (err: any) {
      LoggerService.serviceError('CertificateJobProcessor', `Exception in direct update for job ${jobId}`, err);
    }
  }
}

