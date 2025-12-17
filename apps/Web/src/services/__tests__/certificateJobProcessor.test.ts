import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CertificateJobProcessor } from '../certificateJobProcessor';
import { CertificateService } from '../certificateService';
import { JobQueueService } from '../jobQueueService';
import { EventService } from '../eventService';
import { generatePNGCertificate, convertPNGToPDF } from '../../utils/certificateGenerator';
import { supabase } from '../../lib/supabaseClient';

// Mock dependencies
vi.mock('../certificateService');
vi.mock('../jobQueueService');
vi.mock('../eventService');
vi.mock('../../utils/certificateGenerator');
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    })),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}));

describe('CertificateJobProcessor', () => {
  const mockJobData = {
    eventId: 'event-123',
    userId: 'user-123',
    participantName: 'John Doe',
    eventTitle: 'Test Event',
    completionDate: '2024-12-01',
  };

  const mockConfig = {
    background_color: '#ffffff',
    title_text: 'CERTIFICATE',
    name_config: {
      font_size: 48,
      color: '#000000',
      position: { x: 50, y: 50 },
      font_family: 'Arial',
    },
    width: 2500,
    height: 1768,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks for CertificateService methods
    (CertificateService.getCertificateByParticipantName as any) = vi.fn().mockResolvedValue({
      certificate: null,
      error: null,
    });
    (CertificateService.getCurrentCertificateCount as any) = vi.fn().mockResolvedValue({
      count: 0,
      error: null,
    });
    (CertificateService.incrementCertificateCounter as any) = vi.fn().mockResolvedValue({
      error: null,
    });
    (CertificateService.generateCertificateNumber as any) = vi.fn().mockReturnValue('CERT-001');
    (CertificateService.saveCertificate as any) = vi.fn().mockResolvedValue({
      success: true,
      certificate: { id: 'cert-123', certificate_number: 'CERT-001' },
      error: null,
    });
    (CertificateService.uploadCertificateFile as any) = vi.fn().mockResolvedValue({
      url: 'https://example.com/cert.pdf',
      error: null,
    });
    (JobQueueService.failJob as any) = vi.fn().mockResolvedValue({
      error: null,
    });
    (JobQueueService.updateJobStatusDirectly as any) = vi.fn().mockResolvedValue({});
    (CertificateService.createStandaloneTemplate as any) = vi.fn().mockResolvedValue({
      templateId: 'template-standalone',
      eventId: 'standalone-event-123',
      error: null,
    });
    (EventService.getEventById as any) = vi.fn().mockResolvedValue({
      event: { id: 'event-123', venue: 'Test Venue' },
      error: null,
    });
  });

  describe('processCertificateJob', () => {
    it('should process certificate job successfully', async () => {
      const mockPngBlob = new Blob(['mock png'], { type: 'image/png' });
      const mockPdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });

      (CertificateService.getCertificateConfig as any).mockResolvedValue({
        config: { ...mockConfig, cert_id_prefix: 'CERT' },
        error: null,
      });

      (generatePNGCertificate as any).mockResolvedValue(mockPngBlob);
      (convertPNGToPDF as any).mockResolvedValue(mockPdfBlob);

      (CertificateService.uploadCertificateFile as any)
        .mockResolvedValueOnce({ url: 'https://example.com/cert.pdf', error: null })
        .mockResolvedValueOnce({ url: 'https://example.com/cert.png', error: null });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'template-123' },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
      });

      const result = await CertificateJobProcessor.processCertificateJob(mockJobData);

      expect(result.success).toBe(true);
      expect(CertificateService.getCertificateConfig).toHaveBeenCalledWith('event-123');
      expect(generatePNGCertificate).toHaveBeenCalled();
    });

    it('should handle config fetch errors', async () => {
      (CertificateService.getCertificateConfig as any).mockResolvedValue({
        config: null,
        error: 'Config not found',
      });

      const result = await CertificateJobProcessor.processCertificateJob(mockJobData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Config not found');
      expect(generatePNGCertificate).not.toHaveBeenCalled();
    });

    it('should use provided config for standalone certificates', async () => {
      const standaloneJobData = {
        ...mockJobData,
        eventId: 'standalone',
        config: { ...mockConfig, cert_id_prefix: 'CERT' },
      };

      const mockPngBlob = new Blob(['mock png'], { type: 'image/png' });
      const mockPdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });

      (generatePNGCertificate as any).mockResolvedValue(mockPngBlob);
      (convertPNGToPDF as any).mockResolvedValue(mockPdfBlob);

      (CertificateService.uploadCertificateFile as any)
        .mockResolvedValueOnce({ url: 'https://example.com/cert.pdf', error: null })
        .mockResolvedValueOnce({ url: 'https://example.com/cert.png', error: null });

      const result = await CertificateJobProcessor.processCertificateJob(standaloneJobData);

      expect(result.success).toBe(true);
      expect(CertificateService.getCertificateConfig).not.toHaveBeenCalled();
      expect(generatePNGCertificate).toHaveBeenCalled();
    });

    it('should handle certificate generation errors', async () => {
      (CertificateService.getCertificateConfig as any).mockResolvedValue({
        config: { ...mockConfig, cert_id_prefix: 'CERT' },
        error: null,
      });

      const mockSelectGen = vi.fn().mockReturnThis();
      const mockEq1Gen = vi.fn().mockReturnThis();
      const mockEq2Gen = vi.fn().mockReturnThis();
      const mockLimitGen = vi.fn().mockReturnThis();
      const mockMaybeSingleGen = vi.fn().mockResolvedValue({
        data: { id: 'template-123' },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelectGen,
        eq: mockEq1Gen.mockReturnValue({
          eq: mockEq2Gen.mockReturnValue({
            limit: mockLimitGen.mockReturnValue({
              maybeSingle: mockMaybeSingleGen,
            }),
          }),
        }),
      });

      (generatePNGCertificate as any).mockRejectedValue(new Error('Generation failed'));

      const result = await CertificateJobProcessor.processCertificateJob(mockJobData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle storage upload errors', async () => {
      const mockPngBlob = new Blob(['mock png'], { type: 'image/png' });
      const mockPdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });

      (CertificateService.getCertificateConfig as any).mockResolvedValue({
        config: { ...mockConfig, cert_id_prefix: 'CERT' },
        error: null,
      });

      const mockSelectStorage = vi.fn().mockReturnThis();
      const mockEq1Storage = vi.fn().mockReturnThis();
      const mockEq2Storage = vi.fn().mockReturnThis();
      const mockLimitStorage = vi.fn().mockReturnThis();
      const mockMaybeSingleStorage = vi.fn().mockResolvedValue({
        data: { id: 'template-123' },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelectStorage,
        eq: mockEq1Storage.mockReturnValue({
          eq: mockEq2Storage.mockReturnValue({
            limit: mockLimitStorage.mockReturnValue({
              maybeSingle: mockMaybeSingleStorage,
            }),
          }),
        }),
      });

      (generatePNGCertificate as any).mockResolvedValue(mockPngBlob);
      (convertPNGToPDF as any).mockResolvedValue(mockPdfBlob);

      (CertificateService.uploadCertificateFile as any)
        .mockResolvedValueOnce({ url: null, error: 'Upload failed' })
        .mockResolvedValueOnce({ url: null, error: null });

      const result = await CertificateJobProcessor.processCertificateJob(mockJobData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('processPendingJobs', () => {
    it('should process pending certificate jobs', async () => {
      const mockJob = {
        id: 'job-123',
        job_type: 'certificate_generation',
        job_data: mockJobData,
        status: 'pending',
      };

      (JobQueueService.getNextJob as any).mockResolvedValueOnce({
        job: mockJob,
        error: null,
      }).mockResolvedValueOnce({
        job: null,
        error: null,
      });

      const mockPngBlob = new Blob(['mock png'], { type: 'image/png' });
      const mockPdfBlob = new Blob(['mock pdf'], { type: 'application/pdf' });

      (CertificateService.getCertificateConfig as any).mockResolvedValue({
        config: { ...mockConfig, cert_id_prefix: 'CERT' },
        error: null,
      });

      (generatePNGCertificate as any).mockResolvedValue(mockPngBlob);
      (convertPNGToPDF as any).mockResolvedValue(mockPdfBlob);

      (JobQueueService.completeJob as any).mockResolvedValue({
        error: null,
      });

      (CertificateService.uploadCertificateFile as any)
        .mockResolvedValueOnce({ url: 'https://example.com/cert.pdf', error: null })
        .mockResolvedValueOnce({ url: 'https://example.com/cert.png', error: null });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'template-123' },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
      });

      const result = await CertificateJobProcessor.processPendingJobs();

      expect(result.processed).toBeGreaterThan(0);
      expect(JobQueueService.getNextJob).toHaveBeenCalled();
    });

    it('should handle job processing failures', async () => {
      const mockJob = {
        id: 'job-123',
        job_type: 'certificate_generation',
        job_data: mockJobData,
        status: 'pending',
      };

      (JobQueueService.getNextJob as any).mockResolvedValueOnce({
        job: mockJob,
        error: null,
      }).mockResolvedValueOnce({
        job: null,
        error: null,
      });

      (CertificateService.getCertificateConfig as any).mockResolvedValue({
        config: null,
        error: 'Config error',
      });

      (JobQueueService.failJob as any).mockResolvedValue({
        error: null,
      });
      (JobQueueService.updateJobStatusDirectly as any) = vi.fn().mockResolvedValue({});

      // Mock Supabase for template query
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2.mockReturnValue({
            limit: mockLimit.mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
      });

      const result = await CertificateJobProcessor.processPendingJobs();

      expect(result.processed).toBeGreaterThan(0);
      expect(result.failed).toBeGreaterThan(0);
      expect(JobQueueService.failJob).toHaveBeenCalled();
    });

    it('should skip non-certificate jobs', async () => {
      const mockJob = {
        id: 'job-123',
        job_type: 'other_job_type',
        job_data: {},
        status: 'pending',
      };

      (JobQueueService.getNextJob as any).mockResolvedValueOnce({
        job: mockJob,
        error: null,
      }).mockResolvedValueOnce({
        job: null,
        error: null,
      });

      (JobQueueService.failJob as any).mockResolvedValue({
        error: null,
      });
      (JobQueueService.updateJobStatusDirectly as any) = vi.fn().mockResolvedValue({});

      const result = await CertificateJobProcessor.processPendingJobs();

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1); // Non-certificate jobs are marked as failed
    });
  });
});

