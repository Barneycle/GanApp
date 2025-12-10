/**
 * Certificate Job Processor
 * Processes certificate generation jobs from the queue
 * This should run as a background worker or be called periodically
 */

import { CertificateService } from './certificateService';
import { JobQueueService, CertificateGenerationJobData } from './jobQueueService';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

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
      const { eventId, userId, participantName, eventTitle, completionDate } = jobData;

      // Get certificate config
      const configResult = await CertificateService.getCertificateConfig(eventId);
      if (configResult.error || !configResult.config) {
        return {
          success: false,
          error: configResult.error || 'Certificate config not found'
        };
      }

      const config = configResult.config;

      // Get certificate number
      let certificateNumber: string;
      if (config.cert_id_prefix) {
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
      } else {
        certificateNumber = CertificateService.generateCertificateNumber(eventId, userId);
      }

      // Generate PDF and PNG
      const pdfBytes = await this.generatePDF(config, certificateNumber, participantName, eventTitle, completionDate);
      const pngBlob = await this.generatePNG(config, certificateNumber, participantName, eventTitle, completionDate);

      if (!pdfBytes || !pngBlob) {
        return {
          success: false,
          error: 'Failed to generate certificate files'
        };
      }

      // Upload files
      const pdfFileName = `${certificateNumber}.pdf`;
      const pngFileName = `${certificateNumber}.png`;
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      const [pdfResult, pngResult] = await Promise.all([
        CertificateService.uploadCertificateFile(pdfBlob, pdfFileName, 'pdf', eventId, userId),
        CertificateService.uploadCertificateFile(pngBlob, pngFileName, 'png', eventId, userId)
      ]);

      if (pdfResult.error || pngResult.error) {
        return {
          success: false,
          error: pdfResult.error || pngResult.error || 'Failed to upload certificate files'
        };
      }

      // Increment certificate counter
      const incrementResult = await CertificateService.incrementCertificateCounter(eventId);
      if (incrementResult.error) {
        console.warn('Failed to increment certificate counter:', incrementResult.error);
        // Don't fail the job if counter increment fails
      }

      // Save to database
      const saveResult = await CertificateService.saveCertificate({
        event_id: eventId,
        user_id: userId,
        certificate_number: certificateNumber,
        participant_name: participantName,
        event_title: eventTitle,
        completion_date: completionDate,
        certificate_pdf_url: pdfResult.url,
        certificate_png_url: pngResult.url
      });

      if (saveResult.error) {
        return {
          success: false,
          error: `Failed to save certificate: ${saveResult.error}`
        };
      }

      return {
        success: true,
        certificateNumber,
        pdfUrl: pdfResult.url,
        pngUrl: pngResult.url
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to process certificate job'
      };
    }
  }

  /**
   * Generate PDF certificate (simplified version - you may need to adapt from CertificateGenerator.jsx)
   */
  private static async generatePDF(
    config: any,
    certificateNumber: string,
    participantName: string,
    eventTitle: string,
    completionDate: string
  ): Promise<Uint8Array | null> {
    try {
      // This is a simplified version - you should adapt the full PDF generation logic
      // from CertificateGenerator.jsx here
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([config.width || 2000, config.height || 1200]);
      const { width, height } = page.getSize();

      // Add background color
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(1, 1, 1), // White background
      });

      // Add certificate title
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      page.drawText('CERTIFICATE OF PARTICIPATION', {
        x: width / 2,
        y: height * 0.7,
        size: 48,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      // Add participant name
      page.drawText(participantName, {
        x: width / 2,
        y: height * 0.5,
        size: 36,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      // Add certificate number
      if (config.cert_id_prefix) {
        const certIdSize = config.cert_id_font_size || 16;
        const certIdX = (config.cert_id_position?.x || 50) * width / 100;
        const certIdY = (config.cert_id_position?.y || 95) * height / 100;
        
        page.drawText(certificateNumber, {
          x: certIdX,
          y: certIdY,
          size: certIdSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      }

      // Add QR code if enabled
      if (config.qr_code_enabled) {
        const baseUrl = process.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || window.location.origin;
        const verificationUrl = `${baseUrl}/verify-certificate/${encodeURIComponent(certificateNumber)}`;
        const qrSize = config.qr_code_size || 60;
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: qrSize,
          margin: 1,
          errorCorrectionLevel: 'M'
        });

        // Embed QR code image in PDF
        const qrImage = await pdfDoc.embedPng(qrDataUrl);
        const qrX = (config.qr_code_position?.x || 60) * width / 100;
        const qrY = (config.qr_code_position?.y || 95) * height / 100;
        page.drawImage(qrImage, {
          x: qrX,
          y: qrY - qrSize,
          width: qrSize,
          height: qrSize,
        });
      }

      return await pdfDoc.save();
    } catch (error) {
      console.error('PDF generation error:', error);
      return null;
    }
  }

  /**
   * Generate PNG certificate (simplified version - you may need to adapt from CertificateGenerator.jsx)
   */
  private static async generatePNG(
    config: any,
    certificateNumber: string,
    participantName: string,
    eventTitle: string,
    completionDate: string
  ): Promise<Blob | null> {
    try {
      const width = config.width || 2000;
      const height = config.height || 1200;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) return null;

      // Fill background
      ctx.fillStyle = config.background_color || '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Add certificate title
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CERTIFICATE OF PARTICIPATION', width / 2, height * 0.7);

      // Add participant name
      ctx.font = 'bold 36px Arial';
      ctx.fillText(participantName, width / 2, height * 0.5);

      // Add certificate number
      if (config.cert_id_prefix) {
        const certIdSize = config.cert_id_font_size || 16;
        const certIdX = (config.cert_id_position?.x || 50) * width / 100;
        const certIdY = (config.cert_id_position?.y || 95) * height / 100;
        
        ctx.font = `${certIdSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(certificateNumber, certIdX, certIdY);
      }

      // Add QR code if enabled
      if (config.qr_code_enabled) {
        const baseUrl = process.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || window.location.origin;
        const verificationUrl = `${baseUrl}/verify-certificate/${encodeURIComponent(certificateNumber)}`;
        const qrSize = config.qr_code_size || 60;
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: qrSize,
          margin: 1,
          errorCorrectionLevel: 'M'
        });

        const qrImage = new Image();
        await new Promise((resolve, reject) => {
          qrImage.onload = resolve;
          qrImage.onerror = reject;
          qrImage.src = qrDataUrl;
        });

        const qrX = (config.qr_code_position?.x || 60) * width / 100;
        const qrY = (config.qr_code_position?.y || 95) * height / 100;
        ctx.drawImage(qrImage, qrX, qrY - qrSize, qrSize, qrSize);
      }

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', 1.0);
      });
    } catch (error) {
      console.error('PNG generation error:', error);
      return null;
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
      processed++;

      try {
        if (job.job_type === 'certificate_generation') {
          const result = await this.processCertificateJob(
            job.job_data as CertificateGenerationJobData
          );

          if (result.success) {
            await JobQueueService.completeJob(job.id!, {
              certificateNumber: result.certificateNumber,
              pdfUrl: result.pdfUrl,
              pngUrl: result.pngUrl
            });
            succeeded++;
          } else {
            await JobQueueService.failJob(job.id!, result.error || 'Unknown error');
            failed++;
          }
        } else {
          await JobQueueService.failJob(job.id!, `Unknown job type: ${job.job_type}`);
          failed++;
        }
      } catch (error: any) {
        await JobQueueService.failJob(job.id!, error.message || 'Processing error');
        failed++;
      }
    }

    return { processed, succeeded, failed };
  }
}

