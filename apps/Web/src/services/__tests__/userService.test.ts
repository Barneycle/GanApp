import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../userService';
import { supabase } from '../../lib/supabaseClient';

// Mock Supabase
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkEmailExists', () => {
    it('should return exists: true when email exists', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: { exists: true },
        error: null,
      });

      const result = await UserService.checkEmailExists('test@example.com');

      expect(result.exists).toBe(true);
      expect(result.error).toBeUndefined();
      expect(supabase.rpc).toHaveBeenCalledWith('check_email_exists', {
        user_email: 'test@example.com',
      });
    });

    it('should return exists: false when email does not exist', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: { exists: false },
        error: null,
      });

      const result = await UserService.checkEmailExists('test@example.com');

      expect(result.exists).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid email format', async () => {
      const result = await UserService.checkEmailExists('invalid-email');

      expect(result.exists).toBe(false);
      expect(result.error).toBe('Invalid email format');
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should trim and lowercase email before checking', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: { exists: true },
        error: null,
      });

      await UserService.checkEmailExists('  TEST@EXAMPLE.COM  ');

      expect(supabase.rpc).toHaveBeenCalledWith('check_email_exists', {
        user_email: 'test@example.com',
      });
    });

    it('should handle RPC errors gracefully', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await UserService.checkEmailExists('test@example.com');

      expect(result.exists).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle null/undefined response', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await UserService.checkEmailExists('test@example.com');

      expect(result.exists).toBe(false);
      expect(result.error).toBe('No response from email check');
    });

    it('should handle SQL exception in response data', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: { error: 'SQL exception occurred' },
        error: null,
      });

      const result = await UserService.checkEmailExists('test@example.com');

      expect(result.exists).toBe(false);
      expect(result.error).toBe('SQL exception occurred');
    });
  });

  describe('signIn', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_metadata: {
        role: 'participant',
        first_name: 'Test',
        last_name: 'User',
      },
    };

    const mockSession = {
      user: mockUser,
      access_token: 'token',
    };

    it('should sign in successfully with valid credentials', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await UserService.signIn('test@example.com', 'password123');

      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(result.error).toBeUndefined();
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return error for invalid credentials', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      const result = await UserService.signIn('test@example.com', 'wrongpassword');

      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Invalid login credentials');
      expect(result.errorType).toBe('generic');
    });

    it('should return errorType email when email not found', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: null,
        error: { message: 'User not found with this email' },
      });

      const result = await UserService.signIn('nonexistent@example.com', 'password');

      expect(result.errorType).toBe('email');
    });

    it('should return errorType password when password is incorrect', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: null,
        error: { message: 'Invalid password' },
      });

      const result = await UserService.signIn('test@example.com', 'wrongpassword');

      expect(result.errorType).toBe('password');
    });

    it('should handle banned users', async () => {
      const bannedUser = {
        ...mockUser,
        user_metadata: {
          ...mockUser.user_metadata,
          banned_until: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        },
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: bannedUser, session: { user: bannedUser } },
        error: null,
      });

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: bannedUser } },
        error: null,
      });

      (supabase.auth.signOut as any).mockResolvedValue({ error: null });

      const result = await UserService.signIn('banned@example.com', 'password');

      expect(result.error).toContain('banned');
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle inactive users', async () => {
      const inactiveUser = {
        ...mockUser,
        user_metadata: {
          ...mockUser.user_metadata,
          is_active: false,
        },
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: inactiveUser, session: { user: inactiveUser } },
        error: null,
      });

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: inactiveUser } },
        error: null,
      });

      (supabase.auth.signOut as any).mockResolvedValue({ error: null });

      const result = await UserService.signIn('inactive@example.com', 'password');

      expect(result.error).toContain('inactive');
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('signUp', () => {
    const mockNewUser = {
      id: 'user-456',
      email: 'newuser@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_metadata: {
        role: 'participant',
        first_name: 'New',
        last_name: 'User',
      },
    };

    it('should sign up successfully with valid data', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockNewUser },
        error: null,
      });

      const result = await UserService.signUp(
        'newuser@example.com',
        'password123',
        {
          role: 'participant',
          first_name: 'New',
          last_name: 'User',
        }
      );

      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('newuser@example.com');
      expect(result.message).toBe('User created successfully');
      expect(result.error).toBeUndefined();
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        options: {
          data: expect.objectContaining({
            role: 'participant',
            first_name: 'New',
            last_name: 'User',
          }),
        },
      });
    });

    it('should return error for invalid signup data', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' },
      });

      const result = await UserService.signUp(
        'existing@example.com',
        'password123',
        { role: 'participant' }
      );

      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Email already exists');
    });

    it('should return error when user creation fails', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await UserService.signUp(
        'test@example.com',
        'password123',
        { role: 'participant' }
      );

      expect(result.error).toBe('Failed to create user');
    });

    it('should use default role when not provided', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockNewUser },
        error: null,
      });

      await UserService.signUp('test@example.com', 'password123', {});

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: expect.objectContaining({
            role: 'participant',
          }),
        },
      });
    });
  });
});

