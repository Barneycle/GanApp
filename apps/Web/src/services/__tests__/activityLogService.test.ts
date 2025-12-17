import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActivityLogService } from '../activityLogService';
import { supabase } from '../../lib/supabaseClient';

// Mock dependencies
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../loggerService', () => ({
  LoggerService: {
    serviceWarn: vi.fn(),
    serviceError: vi.fn(),
  },
}));

describe('ActivityLogService', () => {
  const mockActivityLog = {
    id: 'log-123',
    user_id: 'user-123',
    action: 'create',
    resource_type: 'event',
    resource_id: 'event-123',
    resource_name: 'Test Event',
    details: { test: 'data' },
    ip_address: '127.0.0.1',
    user_agent: 'Test Agent',
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logActivity', () => {
    it('should log activity successfully', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: 'log-123',
        error: null,
      });

      const result = await ActivityLogService.logActivity(
        'user-123',
        'create',
        'event',
        {
          resourceId: 'event-123',
          resourceName: 'Test Event',
          details: { test: 'data' },
        }
      );

      expect(result.success).toBe(true);
      expect(result.logId).toBe('log-123');
      expect(result.error).toBeUndefined();
      expect(supabase.rpc).toHaveBeenCalledWith('log_activity', expect.objectContaining({
        p_user_id: 'user-123',
        p_action: 'create',
        p_resource_type: 'event',
      }));
    });

    it('should handle RPC errors', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      });

      const result = await ActivityLogService.logActivity(
        'user-123',
        'create',
        'event'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('RPC error');
      expect(result.logId).toBeUndefined();
    });

    it('should handle missing table/function error gracefully', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'function log_activity does not exist' },
      });

      const result = await ActivityLogService.logActivity(
        'user-123',
        'create',
        'event'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Activity logs table not found');
    });

    it('should use provided IP address and user agent', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: 'log-123',
        error: null,
      });

      await ActivityLogService.logActivity(
        'user-123',
        'create',
        'event',
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Custom Agent',
        }
      );

      expect(supabase.rpc).toHaveBeenCalledWith('log_activity', expect.objectContaining({
        p_ip_address: '192.168.1.1',
        p_user_agent: 'Custom Agent',
      }));
    });
  });

  describe('getActivityLogs', () => {
    it('should return activity logs successfully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: [mockActivityLog],
        error: null,
        count: 1,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
      });

      const result = await ActivityLogService.getActivityLogs();

      expect(result.logs).toBeDefined();
      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.error).toBeUndefined();
    });


    it('should handle database errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
        count: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
      });

      const result = await ActivityLogService.getActivityLogs();

      expect(result.error).toBe('Database error');
      expect(result.logs).toBeUndefined();
    });

    it('should handle missing table error gracefully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'relation "activity_logs" does not exist' },
        count: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
      });

      const result = await ActivityLogService.getActivityLogs();

      expect(result.error).toContain('Activity logs table not found');
    });
  });

  describe('getResourceActivity', () => {
    it('should return activity logs for a resource', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockActivityLog],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2,
          order: mockOrder,
        }),
      });

      const result = await ActivityLogService.getResourceActivity('event', 'event-123');

      expect(result.logs).toBeDefined();
      expect(result.logs).toHaveLength(1);
      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2,
          order: mockOrder,
        }),
      });

      const result = await ActivityLogService.getResourceActivity('event', 'event-123');

      expect(result.error).toBe('Database error');
      expect(result.logs).toBeUndefined();
    });
  });

  describe('getUserActivitySummary', () => {
    it('should return user activity summary', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockResolvedValue({
        data: [
          { action: 'create', resource_type: 'event', created_at: '2024-01-01' },
          { action: 'update', resource_type: 'event', created_at: '2024-01-02' },
          { action: 'create', resource_type: 'survey', created_at: '2024-01-03' },
        ],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
      });

      const result = await ActivityLogService.getUserActivitySummary('user-123', 30);

      expect(result.summary).toBeDefined();
      expect(result.summary!.totalActions).toBe(3);
      expect(result.summary!.byAction.create).toBe(2);
      expect(result.summary!.byAction.update).toBe(1);
      expect(result.summary!.byResourceType.event).toBe(2);
      expect(result.summary!.byResourceType.survey).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
      });

      const result = await ActivityLogService.getUserActivitySummary('user-123', 30);

      expect(result.error).toBe('Database error');
      expect(result.summary).toBeUndefined();
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete old logs successfully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockDelete = vi.fn().mockReturnThis();
      const mockLt = vi.fn().mockReturnThis();
      const mockSelectAfterDelete = vi.fn().mockResolvedValue({
        data: [{ id: 'log-1' }, { id: 'log-2' }],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
        lt: mockLt,
        select: mockSelectAfterDelete,
      });

      const result = await ActivityLogService.deleteOldLogs(365);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockLt = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
        lt: mockLt,
        select: mockSelect,
      });

      const result = await ActivityLogService.deleteOldLogs(365);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });
});

