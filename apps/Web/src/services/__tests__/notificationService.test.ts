import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from '../notificationService';
import { supabase } from '../../lib/supabaseClient';

// Mock dependencies
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('../jobQueueService', () => ({
  JobQueueService: {
    queueSingleNotification: vi.fn(),
  },
}));

vi.mock('../notificationJobProcessor', () => ({
  NotificationJobProcessor: {
    processPendingJobs: vi.fn().mockResolvedValue({ processed: 0, succeeded: 0, failed: 0 }),
  },
}));

describe('NotificationService', () => {
  const mockNotification = {
    id: 'notif-123',
    user_id: 'user-123',
    title: 'Test Notification',
    message: 'Test message',
    type: 'info' as const,
    read: false,
    priority: 'normal' as const,
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should return notifications for user successfully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: [mockNotification],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
      });

      const result = await NotificationService.getNotifications('user-123');

      expect(result.notifications).toBeDefined();
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications![0]).toEqual(mockNotification);
      expect(result.error).toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('should filter out expired notifications', async () => {
      const expiredNotification = {
        ...mockNotification,
        id: 'notif-expired',
        expires_at: '2020-01-01T00:00:00Z', // Past date
      };
      const validNotification = {
        ...mockNotification,
        id: 'notif-valid',
        expires_at: undefined,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: [expiredNotification, validNotification],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
      });

      const result = await NotificationService.getNotifications('user-123');

      expect(result.notifications).toBeDefined();
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications![0].id).toBe('notif-valid');
      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
      });

      const result = await NotificationService.getNotifications('user-123');

      expect(result.error).toBe('Database error');
      expect(result.notifications).toBeUndefined();
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count successfully', async () => {
      // select() with count option returns { count, error } directly
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockResolvedValue({
        count: 5,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2,
        }),
      });

      const result = await NotificationService.getUnreadCount('user-123');

      expect(result.count).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('should return 0 if no unread notifications', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockResolvedValue({
        count: 0,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2,
        }),
      });

      const result = await NotificationService.getUnreadCount('user-123');

      expect(result.count).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockResolvedValue({
        count: null,
        error: { message: 'Database error' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2,
        }),
      });

      const result = await NotificationService.getUnreadCount('user-123');

      expect(result.error).toBe('Database error');
      expect(result.count).toBeUndefined();
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      const result = await NotificationService.markAsRead('notif-123');

      expect(result.error).toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('should handle database errors', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: { message: 'Update failed' },
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      const result = await NotificationService.markAsRead('notif-123');

      expect(result.error).toBe('Update failed');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2,
        }),
      });

      const result = await NotificationService.markAllAsRead('user-123');

      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockResolvedValue({
        error: { message: 'Update failed' },
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2,
        }),
      });

      const result = await NotificationService.markAllAsRead('user-123');

      expect(result.error).toBe('Update failed');
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      const result = await NotificationService.deleteNotification('notif-123');

      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      const result = await NotificationService.deleteNotification('notif-123');

      expect(result.error).toBe('Delete failed');
    });
  });

  describe('deleteAllRead', () => {
    it('should delete all read notifications successfully', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2,
        }),
      });

      const result = await NotificationService.deleteAllRead('user-123');

      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2,
        }),
      });

      const result = await NotificationService.deleteAllRead('user-123');

      expect(result.error).toBe('Delete failed');
    });
  });

  describe('deleteAll', () => {
    it('should delete all notifications successfully', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      const result = await NotificationService.deleteAll('user-123');

      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      const result = await NotificationService.deleteAll('user-123');

      expect(result.error).toBe('Delete failed');
    });
  });

  describe('createNotification', () => {
    it('should create notification immediately when immediate flag is set', async () => {
      const notificationData = {
        title: 'New Notification',
        message: 'New message',
        type: 'success' as const,
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockNotification, ...notificationData },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await NotificationService.createNotification(
        'user-123',
        notificationData.title,
        notificationData.message,
        notificationData.type,
        { immediate: true }
      );

      expect(result.notification).toBeDefined();
      expect(result.notification!.title).toBe('New Notification');
      expect(result.error).toBeUndefined();
      expect(result.queued).toBeUndefined();
    });

    it('should queue notification when immediate flag is not set', async () => {
      const { JobQueueService } = await import('../jobQueueService');
      const { NotificationJobProcessor } = await import('../notificationJobProcessor');

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      (JobQueueService.queueSingleNotification as any).mockResolvedValue({
        job: { id: 'job-123' },
        error: null,
      });

      const result = await NotificationService.createNotification(
        'user-123',
        'Test Title',
        'Test message',
        'info'
      );

      expect(result.queued).toBe(true);
      expect(result.jobId).toBe('job-123');
      expect(result.error).toBeUndefined();
      expect(JobQueueService.queueSingleNotification).toHaveBeenCalled();
    });

    it('should handle immediate creation errors', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await NotificationService.createNotification(
        'user-123',
        'Test Title',
        'Test message',
        'info',
        { immediate: true }
      );

      expect(result.error).toBe('Insert failed');
      expect(result.notification).toBeUndefined();
    });

    it('should handle queue errors', async () => {
      const { JobQueueService } = await import('../jobQueueService');

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      (JobQueueService.queueSingleNotification as any).mockResolvedValue({
        job: null,
        error: 'Queue failed',
      });

      const result = await NotificationService.createNotification(
        'user-123',
        'Test Title',
        'Test message',
        'info'
      );

      expect(result.error).toBe('Queue failed');
      expect(result.queued).toBeUndefined();
    });
  });
});

