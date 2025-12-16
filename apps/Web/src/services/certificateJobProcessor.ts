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
        console.log('[Job Processor] Using participant-specific user_id for standalone certificate:', certificateUserId);
      } else {
        // For event-based certificates, use the authenticated user's ID
        // This allows participants to generate their own certificates (satisfies RLS: user_id = auth.uid())
        certificateUserId = userId;
        console.log('[Job Processor] Using authenticated user_id for event certificate:', certificateUserId);
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
          console.error('[Job Processor] Error fetching template:', templateError);
          // Continue anyway - saveCertificate will try to find one
        } else if (templates) {
          templateId = templates.id;
          console.log('[Job Processor] Found template ID:', templateId);
        } else {
          console.warn('[Job Processor] No certificate template found for event:', eventId);
          // Continue anyway - saveCertificate will try to find one
        }
      } else if (eventId === 'standalone') {
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

      // Check if certificate already exists BEFORE generating files
      // This prevents generating files unnecessarily and ensures certificate numbers remain unique
      if (actualEventId && eventId !== 'standalone' && typeof eventId === 'string' && eventId.trim() !== '') {
        // Priority check: ALWAYS check by participant_name first
        // This works for both manual entries and event participants since participant_name is unique per event
        // Manual entries share organizer's user_id, so checking by user_id alone would incorrectly flag duplicates
        let existingCert = null;

        const trimmedParticipantName = participantName.trim();
        console.log('[Job Processor] 🔍 DUPLICATE CHECK START - participant:', JSON.stringify(trimmedParticipantName), 'event:', actualEventId, 'user_id:', certificateUserId);

        // Check by participant_name ONLY (works for both manual entries and event participants)
        // For manual entries, all participants share organizer's user_id, so user_id check would cause false positives
        const existingCertByName = await CertificateService.getCertificateByParticipantName(trimmedParticipantName, actualEventId);
        if (existingCertByName.error) {
          console.error('[Job Processor] ❌ ERROR checking certificate by participant_name:', existingCertByName.error);
        } else if (existingCertByName.certificate) {
          existingCert = existingCertByName.certificate;
          console.log('[Job Processor] ❌ DUPLICATE FOUND by participant_name:', {
            id: existingCert.id,
            certificate_number: existingCert.certificate_number,
            participant_name_in_db: JSON.stringify(existingCert.participant_name),
            searching_for: JSON.stringify(trimmedParticipantName),
            names_match: existingCert.participant_name === trimmedParticipantName,
            user_id: existingCert.user_id
          });
        } else {
          console.log('[Job Processor] ✅ NO DUPLICATE - No certificate found by participant_name for:', JSON.stringify(trimmedParticipantName));
        }

        // For manual entries: skip user_id check entirely since all manual entries share organizer's user_id
        // Only check by user_id for actual event participants (registered users with their own accounts)
        // We can detect manual entries by checking if the userId passed in matches what would be used for a registered participant
        // For now, ONLY check by participant_name - this is the most reliable way to detect duplicates
        // The user_id check was causing false positives for manual entries

        // REMOVED: user_id check causes issues for manual entries since they all share the same user_id
        // Only participant_name check is sufficient and correct

        if (existingCert) {
          console.log('[Job Processor] Certificate already exists for this participant and event. Skipping generation to preserve certificate number uniqueness:', existingCert.id);
          console.log('[Job Processor] Counter will NOT increment for duplicate certificates (this is correct behavior)');
          return {
            success: false,
            error: `Certificate already exists for this participant. Certificate number: ${existingCert.certificate_number}. Cannot create duplicate certificate.`
          };
        }
        console.log('[Job Processor] No existing certificate found - proceeding with new certificate generation');
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
          console.log('[Job Processor] Getting current certificate count for event:', eventIdForCounter);
          const countResult = await CertificateService.getCurrentCertificateCount(eventIdForCounter);
          if (countResult.error) {
            console.error('[Job Processor] Failed to get certificate count:', countResult.error);
            return {
              success: false,
              error: `Failed to get certificate count: ${countResult.error}`
            };
          }
          const currentCount = countResult.count || 0;
          const nextCount = currentCount + 1;
          const formattedNumber = String(nextCount).padStart(3, '0');
          certificateNumber = `${config.cert_id_prefix}-${formattedNumber}`;
          console.log('[Job Processor] Current counter:', currentCount, '→ Next certificate number:', certificateNumber, '(counter will increment to', nextCount, 'after successful save)');
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
            console.log('[Job Processor] Found venue:', venue);
          }
        } catch (venueError) {
          console.warn('[Job Processor] Could not fetch event venue:', venueError);
          // Continue without venue - will use fallback
        }
      }

      // Generate PNG first, then convert to PDF
      console.log('[Job Processor] Generating PNG certificate...');
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
        console.log('[Job Processor] PNG generated:', pngBlob ? `${pngBlob.size} bytes` : 'FAILED');

        if (!pngBlob) {
          throw new Error('PNG generation returned null');
        }
      } catch (pngError: any) {
        console.error('[Job Processor] PNG generation error:', pngError);
        return {
          success: false,
          error: `PNG generation failed: ${pngError.message || 'Unknown error'}`
        };
      }

      try {
        // Convert PNG to PDF
        console.log('[Job Processor] Converting PNG to PDF...');
        const width = config.width || 842;  // A4 landscape width in points
        const height = config.height || 595; // A4 landscape height in points
        pdfBytes = await convertPNGToPDF(pngBlob, width, height);
        console.log('[Job Processor] PDF generated:', pdfBytes ? `${pdfBytes.length} bytes` : 'FAILED');
      } catch (pdfError: any) {
        console.error('[Job Processor] PDF conversion error:', pdfError);
        return {
          success: false,
          error: `PDF generation failed: ${pdfError.message || 'Unknown error'}`
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

      // Increment certificate counter ONLY after successful save
      // This ensures the counter only increments when a certificate is actually created
      if (eventId !== 'standalone' && actualEventId && config.cert_id_prefix) {
        console.log('[Job Processor] Incrementing certificate counter for event:', actualEventId);
        const incrementResult = await CertificateService.incrementCertificateCounter(actualEventId);
        if (incrementResult.error) {
          console.warn('[Job Processor] Failed to increment certificate counter after save:', incrementResult.error);
          // Don't fail the job if counter increment fails - certificate was saved successfully
        } else {
          // Verify the counter was incremented
          const verifyResult = await CertificateService.getCurrentCertificateCount(actualEventId);
          console.log('[Job Processor] ✅ Certificate counter incremented successfully. Current counter value:', verifyResult.count || 'unknown');
        }
      }

      console.log('[Job Processor] Certificate generation completed successfully:', {
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
        console.error('[Job Processor] Failed to send certificate ready notification:', notifError);
        // Don't fail the job if notification fails
      }

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
        } else if (job.job_type === 'bulk_notification') {
          console.log(`[Job Processor] Processing bulk notification job ${jobId}...`);
          const result = await NotificationJobProcessor.processBulkNotificationJob(
            job.job_data as any
          );

          if (result.success) {
            console.log(`[Job Processor] Bulk notification job ${jobId} completed successfully`);
            const completeResult = await JobQueueService.completeJob(jobId, {
              sent: result.sent
            });

            if (completeResult.error) {
              console.error(`[Job Processor] Failed to mark job ${jobId} as complete:`, completeResult.error);
            }
            succeeded++;
          } else {
            console.error(`[Job Processor] Bulk notification job ${jobId} failed:`, result.error);
            const failResult = await JobQueueService.failJob(jobId, result.error || 'Unknown error');
            if (failResult.error) {
              console.error(`[Job Processor] Failed to mark job ${jobId} as failed:`, failResult.error);
            }
            failed++;
          }
        } else if (job.job_type === 'single_notification') {
          console.log(`[Job Processor] Processing single notification job ${jobId}...`);
          const result = await NotificationJobProcessor.processSingleNotificationJob(
            job.job_data as any
          );

          if (result.success) {
            console.log(`[Job Processor] Single notification job ${jobId} completed successfully`);
            const completeResult = await JobQueueService.completeJob(jobId, {
              notificationId: result.notificationId
            });

            if (completeResult.error) {
              console.error(`[Job Processor] Failed to mark job ${jobId} as complete:`, completeResult.error);
            }
            succeeded++;
          } else {
            console.error(`[Job Processor] Single notification job ${jobId} failed:`, result.error);
            const failResult = await JobQueueService.failJob(jobId, result.error || 'Unknown error');
            if (failResult.error) {
              console.error(`[Job Processor] Failed to mark job ${jobId} as failed:`, failResult.error);
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

