import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventService } from '../eventService';
import { supabase } from '../../lib/supabaseClient';
import { CacheService } from '../cacheService';

// Mock dependencies
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../cacheService', () => ({
  CacheService: {
    keys: {
      event: vi.fn((id: string) => `event:${id}`),
    },
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    deletePattern: vi.fn(),
  },
}));

vi.mock('../utils/activityLogger', () => ({
  logActivity: vi.fn().mockResolvedValue({ success: true }),
  createActivityDetails: vi.fn((before, after, changes) => ({ before, after, changes })),
}));

describe('EventService', () => {
  const mockEvent = {
    id: 'event-123',
    title: 'Test Event',
    rationale: 'Test rationale',
    start_date: '2024-12-01T10:00:00Z',
    end_date: '2024-12-01T18:00:00Z',
    venue: 'Test Venue',
    status: 'published' as const,
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllEvents', () => {
    it('should return all events successfully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockEvent],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      // Mock participant count query
      const mockCount = vi.fn().mockResolvedValue({ count: 5 });
      const mockEq = vi.fn().mockReturnThis();
      const mockHead = vi.fn().mockReturnValue(mockCount);

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: mockEq,
            head: mockHead,
          };
        }
        return {
          select: mockSelect,
          order: mockOrder,
        };
      });

      const result = await EventService.getAllEvents();

      expect(result.events).toBeDefined();
      expect(result.events?.length).toBe(1);
      expect(result.events?.[0].title).toBe('Test Event');
      expect(result.error).toBeUndefined();
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

      const result = await EventService.getAllEvents();

      expect(result.events).toBeUndefined();
      expect(result.error).toBe('Database error');
    });

    it('should calculate current participants for each event', async () => {
      const events = [mockEvent, { ...mockEvent, id: 'event-456' }];
      let callCount = 0;

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: events,
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'event_registrations') {
          callCount++;
          const mockEq1 = vi.fn().mockReturnThis();
          const mockEq2 = vi.fn().mockResolvedValue({ count: callCount * 2 });
          return {
            select: vi.fn().mockReturnThis(),
            eq: mockEq1.mockReturnValue({
              eq: mockEq2,
            }),
          };
        }
        return {
          select: mockSelect,
          order: mockOrder,
        };
      });

      const result = await EventService.getAllEvents();

      expect(result.events).toBeDefined();
      expect(result.events?.length).toBe(2);
      expect(result.events?.[0].current_participants).toBe(2);
      expect(result.events?.[1].current_participants).toBe(4);
    });
  });

  describe('createEvent', () => {
    it('should create event successfully', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockEvent,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      (CacheService.deletePattern as any).mockResolvedValue(undefined);

      const eventData = {
        title: 'New Event',
        created_by: 'user-123',
      };

      const result = await EventService.createEvent(eventData);

      expect(result.event).toBeDefined();
      expect(result.event?.title).toBe('Test Event');
      expect(result.error).toBeUndefined();
      expect(mockInsert).toHaveBeenCalledWith([eventData]);
      expect(CacheService.deletePattern).toHaveBeenCalledWith('events:*');
    });

    it('should handle creation errors', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Creation failed' },
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await EventService.createEvent({
        title: 'New Event',
        created_by: 'user-123',
      });

      expect(result.event).toBeUndefined();
      expect(result.error).toBe('Creation failed');
    });

    it('should handle unexpected errors', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await EventService.createEvent({
        title: 'New Event',
        created_by: 'user-123',
      });

      expect(result.error).toBe('An unexpected error occurred');
    });
  });

  describe('updateEvent', () => {
    it('should update event successfully', async () => {
      const updatedEvent = { ...mockEvent, title: 'Updated Event' };

      // Mock old event fetch
      const mockSelectOld = vi.fn().mockReturnThis();
      const mockEqOld = vi.fn().mockReturnThis();
      const mockSingleOld = vi.fn().mockResolvedValue({
        data: mockEvent,
        error: null,
      });

      // Mock update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: updatedEvent,
        error: null,
      });

      let callCount = 0;
      (supabase.from as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call for old event
          return {
            select: mockSelectOld,
            eq: mockEqOld,
            single: mockSingleOld,
          };
        }
        // Second call for update
        return {
          update: mockUpdate,
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        };
      });

      (CacheService.delete as any).mockResolvedValue(undefined);
      (CacheService.deletePattern as any).mockResolvedValue(undefined);

      const result = await EventService.updateEvent('event-123', {
        title: 'Updated Event',
      });

      expect(result.event).toBeDefined();
      expect(result.event?.title).toBe('Updated Event');
      expect(result.error).toBeUndefined();
      expect(mockUpdate).toHaveBeenCalledWith({ title: 'Updated Event' });
      expect(CacheService.delete).toHaveBeenCalled();
      expect(CacheService.deletePattern).toHaveBeenCalledWith('events:*');
    });

    it('should handle update errors', async () => {
      const mockSelectOld = vi.fn().mockReturnThis();
      const mockEqOld = vi.fn().mockReturnThis();
      const mockSingleOld = vi.fn().mockResolvedValue({
        data: mockEvent,
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      let callCount = 0;
      (supabase.from as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: mockSelectOld,
            eq: mockEqOld,
            single: mockSingleOld,
          };
        }
        return {
          update: mockUpdate,
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        };
      });

      const result = await EventService.updateEvent('event-123', {
        title: 'Updated Event',
      });

      expect(result.event).toBeUndefined();
      expect(result.error).toBe('Update failed');
    });
  });

  describe('deleteEvent', () => {
    it('should delete event successfully', async () => {
      // Mock old event fetch
      const mockSelectOld = vi.fn().mockReturnThis();
      const mockEqOld = vi.fn().mockReturnThis();
      const mockSingleOld = vi.fn().mockResolvedValue({
        data: mockEvent,
        error: null,
      });

      // Mock delete
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      let callCount = 0;
      (supabase.from as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: mockSelectOld,
            eq: mockEqOld,
            single: mockSingleOld,
          };
        }
        return {
          delete: mockDelete,
          eq: mockEq,
        };
      });

      (CacheService.delete as any).mockResolvedValue(undefined);
      (CacheService.deletePattern as any).mockResolvedValue(undefined);

      const result = await EventService.deleteEvent('event-123');

      expect(result.error).toBeUndefined();
      expect(mockDelete).toHaveBeenCalled();
      expect(CacheService.delete).toHaveBeenCalled();
      expect(CacheService.deletePattern).toHaveBeenCalledWith('events:*');
    });

    it('should handle delete errors', async () => {
      const mockSelectOld = vi.fn().mockReturnThis();
      const mockEqOld = vi.fn().mockReturnThis();
      const mockSingleOld = vi.fn().mockResolvedValue({
        data: mockEvent,
        error: null,
      });

      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      let callCount = 0;
      (supabase.from as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: mockSelectOld,
            eq: mockEqOld,
            single: mockSingleOld,
          };
        }
        return {
          delete: mockDelete,
          eq: mockEq,
        };
      });

      const result = await EventService.deleteEvent('event-123');

      expect(result.error).toBe('Delete failed');
    });
  });
});

