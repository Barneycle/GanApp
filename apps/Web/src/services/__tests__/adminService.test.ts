import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminService } from '../adminService';
import { supabase } from '../../lib/supabaseClient';

// Mock dependencies
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      admin: {
        getUserById: vi.fn(),
      },
    },
  },
}));

vi.mock('../utils/activityLogger', () => ({
  logActivity: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../services/emailService', () => ({
  EmailService: {
    sendBanEmail: vi.fn().mockResolvedValue({ success: true }),
    sendUnbanEmail: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../services/notificationService', () => ({
  NotificationService: {
    createNotification: vi.fn().mockResolvedValue({ notification: {} }),
  },
}));

vi.mock('../services/loggerService', () => ({
  LoggerService: {
    serviceError: vi.fn(),
  },
}));

describe('AdminService', () => {
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
  };

  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    role: 'participant',
    first_name: 'John',
    last_name: 'Doe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: mockAdminUser },
    });
  });

  describe('getAllUsers', () => {
    it('should return all users successfully', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: {
          success: true,
          users: [mockUser],
        },
        error: null,
      });

      const result = await AdminService.getAllUsers();

      expect(result.users).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.error).toBeUndefined();
      expect(supabase.rpc).toHaveBeenCalledWith('list_users', expect.objectContaining({
        active_only: false,
        role_filter: null,
      }));
    });

    it('should handle RPC function not found', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Could not find the function public.list_users' },
      });

      const result = await AdminService.getAllUsers();

      expect(result.users).toEqual([]);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('list_users');
      expect(result.error).toBeUndefined();
    });

    it('should handle RPC errors', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await AdminService.getAllUsers();

      expect(result.error).toBe('Database error');
      expect(result.users).toBeUndefined();
    });

    it('should handle unsuccessful RPC response', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: {
          success: false,
          error: 'Permission denied',
        },
        error: null,
      });

      const result = await AdminService.getAllUsers();

      expect(result.error).toBe('Permission denied');
      expect(result.users).toBeUndefined();
    });
  });

  describe('banUser', () => {
    it('should ban user successfully', async () => {
      const banUntil = new Date('2025-12-31');
      const reason = 'Violation of terms';

      (supabase.rpc as any).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      (supabase.auth.admin.getUserById as any).mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            user_metadata: {
              first_name: 'John',
              last_name: 'Doe',
            },
          },
        },
      });

      const result = await AdminService.banUser('user-123', banUntil, reason);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(supabase.rpc).toHaveBeenCalledWith('ban_user', expect.objectContaining({
        target_user_uuid: 'user-123',
        banned_until: banUntil.toISOString(),
      }));
    });

    it('should handle not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
      });

      const result = await AdminService.banUser('user-123', new Date(), 'reason');

      expect(result.error).toBe('Not authenticated');
      expect(result.success).toBeUndefined();
    });

    it('should handle RPC function not found', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'function ban_user does not exist' },
      });

      const result = await AdminService.banUser('user-123', new Date(), 'reason');

      expect(result.error).toContain('ban_user');
      expect(result.success).toBeUndefined();
    });

    it('should handle RPC errors', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      });

      const result = await AdminService.banUser('user-123', new Date(), 'reason');

      expect(result.error).toBe('RPC error');
      expect(result.success).toBeUndefined();
    });

    it('should handle unsuccessful RPC response', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: { success: false, error: 'User not found' },
        error: null,
      });

      const result = await AdminService.banUser('user-123', new Date(), 'reason');

      expect(result.error).toBe('User not found');
      expect(result.success).toBeUndefined();
    });
  });

  describe('unbanUser', () => {
    it('should unban user successfully', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      (supabase.auth.admin.getUserById as any).mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            user_metadata: {
              first_name: 'John',
              last_name: 'Doe',
            },
          },
        },
      });

      const result = await AdminService.unbanUser('user-123');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(supabase.rpc).toHaveBeenCalledWith('unban_user', expect.objectContaining({
        target_user_uuid: 'user-123',
      }));
    });

    it('should handle not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
      });

      const result = await AdminService.unbanUser('user-123');

      expect(result.error).toBe('Not authenticated');
      expect(result.success).toBeUndefined();
    });

    it('should handle RPC function not found', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'function unban_user does not exist' },
      });

      const result = await AdminService.unbanUser('user-123');

      expect(result.error).toContain('unban_user');
      expect(result.success).toBeUndefined();
    });

    it('should handle RPC errors', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      });

      const result = await AdminService.unbanUser('user-123');

      expect(result.error).toBe('RPC error');
      expect(result.success).toBeUndefined();
    });
  });

  describe('changeUserRole', () => {
    it('should change user role successfully', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: null,
      });

      (supabase.auth.admin.getUserById as any).mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            user_metadata: {
              first_name: 'John',
              last_name: 'Doe',
            },
          },
        },
      });

      const result = await AdminService.changeUserRole('user-123', 'organizer');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(supabase.rpc).toHaveBeenCalledWith('assign_user_role', expect.objectContaining({
        target_user_uuid: 'user-123',
        new_role_text: 'organizer',
      }));
    });

    it('should handle not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
      });

      const result = await AdminService.changeUserRole('user-123', 'organizer');

      expect(result.error).toBe('Not authenticated');
      expect(result.success).toBeUndefined();
    });

    it('should handle RPC function not found', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'function assign_user_role does not exist' },
      });

      const result = await AdminService.changeUserRole('user-123', 'organizer');

      expect(result.error).toContain('assign_user_role');
      expect(result.success).toBeUndefined();
    });

    it('should handle RPC errors', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      });

      const result = await AdminService.changeUserRole('user-123', 'organizer');

      expect(result.error).toBe('RPC error');
      expect(result.success).toBeUndefined();
    });

    it('should handle relation not found error', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'relation "users" does not exist' },
      });

      const result = await AdminService.changeUserRole('user-123', 'organizer');

      expect(result.error).toContain('assign_user_role');
      expect(result.success).toBeUndefined();
    });
  });

  describe('getArchivedUsers', () => {
    it('should return archived users successfully', async () => {
      const mockArchivedUser = {
        id: 'archived-123',
        email: 'archived@example.com',
        archived_at: '2024-01-01T00:00:00Z',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockArchivedUser],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const result = await AdminService.getArchivedUsers();

      expect(result.users).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.error).toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('archived_users');
    });

    it('should handle table not found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'relation "archived_users" does not exist' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const result = await AdminService.getArchivedUsers();

      expect(result.users).toEqual([]);
      expect(result.error).toContain('Archived users table not found');
    });

    it('should handle database errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const result = await AdminService.getArchivedUsers();

      expect(result.error).toBe('Database error');
      expect(result.users).toBeUndefined();
    });
  });
});

