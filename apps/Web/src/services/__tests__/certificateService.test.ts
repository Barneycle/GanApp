import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CertificateService } from '../certificateService';
import { supabase } from '../../lib/supabaseClient';
import { CacheService } from '../cacheService';

// Mock dependencies
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../cacheService', () => ({
  CacheService: {
    keys: {
      certificateConfig: vi.fn((eventId: string) => `cert_config:${eventId}`),
    },
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    TTL: {
      MEDIUM: 1800,
    },
  },
}));

describe('CertificateService', () => {
  const mockConfig = {
    id: 'config-123',
    event_id: 'event-123',
    background_color: '#ffffff',
    title_text: 'CERTIFICATE',
    width: 2500,
    height: 1768,
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockCertificate = {
    id: 'cert-123',
    event_id: 'event-123',
    user_id: 'user-123',
    certificate_number: 'CERT-001',
    participant_name: 'John Doe',
    event_title: 'Test Event',
    completion_date: '2024-12-01',
    certificate_pdf_url: 'https://example.com/cert.pdf',
    certificate_png_url: 'https://example.com/cert.png',
    generated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (CacheService.get as any).mockResolvedValue(null);
  });

  describe('getCertificateConfig', () => {
    it('should return config from cache if available', async () => {
      (CacheService.get as any).mockResolvedValue(mockConfig);

      const result = await CertificateService.getCertificateConfig('event-123');

      expect(result.config).toEqual(mockConfig);
      expect(result.error).toBeUndefined();
      expect(CacheService.get).toHaveBeenCalledWith('cert_config:event-123');
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should fetch config from database if not in cache', async () => {
      (CacheService.get as any).mockResolvedValue(null);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockConfig,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await CertificateService.getCertificateConfig('event-123');

      expect(result.config).toEqual(mockConfig);
      expect(result.error).toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('certificate_configs');
      expect(CacheService.set).toHaveBeenCalledWith('cert_config:event-123', mockConfig, 1800);
    });

    it('should return undefined config if not found', async () => {
      (CacheService.get as any).mockResolvedValue(null);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await CertificateService.getCertificateConfig('event-123');

      expect(result.config).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      (CacheService.get as any).mockResolvedValue(null);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await CertificateService.getCertificateConfig('event-123');

      expect(result.error).toBe('Database error');
      expect(result.config).toBeUndefined();
    });
  });

  describe('saveCertificateConfig', () => {
    it('should update existing config', async () => {
      const configData = {
        background_color: '#000000',
        title_text: 'UPDATED CERTIFICATE',
      };

      const updatedConfig = { ...mockConfig, ...configData };

      // Mock getCertificateConfig to return existing config (via cache)
      (CacheService.get as any).mockResolvedValue(mockConfig);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: updatedConfig,
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        update: mockUpdate,
      });

      const result = await CertificateService.saveCertificateConfig('event-123', configData, 'user-123');

      expect(result.config).toBeDefined();
      expect(result.config!.title_text).toBe('UPDATED CERTIFICATE');
      expect(result.error).toBeUndefined();
      expect(CacheService.delete).toHaveBeenCalledWith('cert_config:event-123');
    });

    it('should create new config if not exists', async () => {
      const configData = {
        background_color: '#ffffff',
        title_text: 'NEW CERTIFICATE',
      };

      // Mock getCertificateConfig to return no config
      (CacheService.get as any).mockResolvedValue(null);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn()
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })
        .mockResolvedValueOnce({
          data: { ...mockConfig, ...configData },
          error: null,
        });

      const mockInsert = vi.fn().mockReturnThis();

      let callCount = 0;
      (supabase.from as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: getCertificateConfig (check existing)
          return {
            select: mockSelect,
            eq: mockEq,
            single: mockSingle,
          };
        } else {
          // Second call: insert
          return {
            insert: mockInsert,
            select: mockSelect,
            single: mockSingle,
          };
        }
      });

      const result = await CertificateService.saveCertificateConfig('event-123', configData, 'user-123');

      expect(result.config).toBeDefined();
      expect(result.config!.title_text).toBe('NEW CERTIFICATE');
      expect(result.error).toBeUndefined();
    });
  });

  describe('getUserCertificate', () => {
    it('should return certificate for user and event', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockCertificate,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2.mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const result = await CertificateService.getUserCertificate('user-123', 'event-123');

      expect(result.certificate).toEqual(mockCertificate);
      expect(result.error).toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('certificates');
    });

    it('should return undefined if certificate not found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2.mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const result = await CertificateService.getUserCertificate('user-123', 'event-123');

      expect(result.certificate).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2.mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const result = await CertificateService.getUserCertificate('user-123', 'event-123');

      expect(result.error).toBe('Database error');
      expect(result.certificate).toBeUndefined();
    });
  });

  describe('getCertificateByParticipantName', () => {
    it('should return certificate by participant name', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockCertificate,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2.mockReturnValue({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      });

      const result = await CertificateService.getCertificateByParticipantName('John Doe', 'event-123');

      expect(result.certificate).toEqual(mockCertificate);
      expect(result.error).toBeUndefined();
    });

    it('should return undefined if certificate not found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2.mockReturnValue({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      });

      const result = await CertificateService.getCertificateByParticipantName('John Doe', 'event-123');

      expect(result.certificate).toBeUndefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('saveCertificate', () => {
    it('should save new certificate successfully', async () => {
      const certificateData = {
        event_id: 'event-123',
        user_id: 'user-123',
        certificate_number: 'CERT-002',
        participant_name: 'Jane Doe',
        event_title: 'Test Event',
        completion_date: '2024-12-01',
        certificate_pdf_url: 'https://example.com/cert.pdf',
        certificate_png_url: 'https://example.com/cert.png',
      };

      const newCertificate = { ...mockCertificate, ...certificateData };

      // Mock check by certificate_number (not found)
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      
      // First query: check by certificate_number
      const mockMaybeSingle1 = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });
      
      // Second query: check by event_id and user_id
      const mockMaybeSingle2 = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      
      // Third query: check template
      const mockMaybeSingle3 = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      
      // Fourth query: insert result
      const mockSingle = vi.fn().mockResolvedValue({
        data: newCertificate,
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const mockLimit = vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle3,
      });

      let certCallCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'certificates') {
          certCallCount++;
          if (certCallCount === 1) {
            // Check by certificate_number
            return {
              select: mockSelect,
              eq: mockEq,
              maybeSingle: mockMaybeSingle1,
            };
          } else if (certCallCount === 2) {
            // Check by event_id and user_id
            return {
              select: mockSelect,
              eq: mockEq.mockReturnValue({
                eq: mockEq,
                maybeSingle: mockMaybeSingle2,
              }),
            };
          } else {
            // Insert
            return {
              insert: mockInsert,
            };
          }
        } else if (table === 'certificate_templates') {
          const mockEqTemplate1 = vi.fn().mockReturnThis();
          const mockEqTemplate2 = vi.fn().mockReturnThis();
          return {
            select: mockSelect,
            eq: mockEqTemplate1.mockReturnValue({
              eq: mockEqTemplate2.mockReturnValue({
                limit: mockLimit,
              }),
            }),
          };
        }
        return {
          select: mockSelect,
          eq: mockEq,
          maybeSingle: mockMaybeSingle1,
        };
      });

      const result = await CertificateService.saveCertificate(certificateData);

      expect(result.certificate).toBeDefined();
      expect(result.certificate!.certificate_number).toBe('CERT-002');
      expect(result.error).toBeUndefined();
    });

    it('should return existing certificate if certificate_number already exists', async () => {
      const certificateData = {
        event_id: 'event-123',
        user_id: 'user-123',
        certificate_number: 'CERT-001',
        participant_name: 'John Doe',
        event_title: 'Test Event',
        completion_date: '2024-12-01',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockCertificate,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      });

      const result = await CertificateService.saveCertificate(certificateData);

      expect(result.certificate).toEqual(mockCertificate);
      expect(result.error).toBeUndefined();
    });
  });

  describe('getCurrentCertificateCount', () => {
    it('should return current certificate count', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { current_count: 5 },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await CertificateService.getCurrentCertificateCount('event-123');

      expect(result.count).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('should return 0 if counter not found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await CertificateService.getCurrentCertificateCount('event-123');

      expect(result.count).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await CertificateService.getCurrentCertificateCount('event-123');

      expect(result.error).toBe('Database error');
      expect(result.count).toBeUndefined();
    });
  });

  describe('getNextCertificateNumber', () => {
    it('should generate certificate number with prefix', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: 1,
        error: null,
      });

      const result = await CertificateService.getNextCertificateNumber('event-123', 'CERT');

      expect(result.number).toBe('CERT-001');
      expect(result.error).toBeUndefined();
      expect(supabase.rpc).toHaveBeenCalledWith('get_next_certificate_number', {
        event_uuid: 'event-123',
      });
    });

    it('should generate certificate number without prefix', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: 42,
        error: null,
      });

      const result = await CertificateService.getNextCertificateNumber('event-123', '');

      expect(result.number).toBe('042');
      expect(result.error).toBeUndefined();
    });

    it('should handle RPC errors', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      });

      const result = await CertificateService.getNextCertificateNumber('event-123', 'CERT');

      expect(result.error).toBe('RPC error');
      expect(result.number).toBeUndefined();
    });
  });

  describe('verifyCertificate', () => {
    it('should verify certificate by number', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockCertificate,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await CertificateService.verifyCertificate('CERT-001');

      expect(result.certificate).toBeDefined();
      expect(result.certificate!.certificate_number).toBe('CERT-001');
      expect(result.error).toBeUndefined();
    });

    it('should return error if certificate not found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await CertificateService.verifyCertificate('INVALID-001');

      expect(result.error).toContain('Certificate not found');
      expect(result.certificate).toBeUndefined();
    });
  });
});

