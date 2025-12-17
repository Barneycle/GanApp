import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SurveyService } from '../surveyService';
import { supabase } from '../../lib/supabaseClient';

// Mock dependencies
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../utils/activityLogger', () => ({
  logActivity: vi.fn().mockResolvedValue({ success: true }),
  createActivityDetails: vi.fn((before, after, changes) => ({ before, after, changes })),
}));

describe('SurveyService', () => {
  const mockSurvey = {
    id: 'survey-123',
    title: 'Test Survey',
    description: 'Test description',
    event_id: 'event-123',
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    questions: [],
    is_active: true,
    is_open: true,
    opens_at: null,
    closes_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSurveys', () => {
    it('should return all surveys successfully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockSurvey],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const result = await SurveyService.getAllSurveys();

      expect(result.surveys).toBeDefined();
      expect(result.surveys).toHaveLength(1);
      expect(result.surveys![0]).toEqual(mockSurvey);
      expect(result.error).toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('surveys');
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

      const result = await SurveyService.getAllSurveys();

      expect(result.error).toBe('Database error');
      expect(result.surveys).toBeUndefined();
    });

    it('should handle unexpected errors', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await SurveyService.getAllSurveys();

      expect(result.error).toBe('An unexpected error occurred');
      expect(result.surveys).toBeUndefined();
    });
  });

  describe('getSurveyById', () => {
    it('should return survey by id successfully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockSurvey,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      // Mock autoOpenScheduledSurveys and autoCloseScheduledSurveys (they're called internally)
      const result = await SurveyService.getSurveyById('survey-123');

      expect(result.survey).toBeDefined();
      expect(result.survey).toEqual(mockSurvey);
      expect(result.error).toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('surveys');
    });

    it('should handle survey not found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Survey not found' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await SurveyService.getSurveyById('non-existent');

      expect(result.error).toBe('Survey not found');
      expect(result.survey).toBeUndefined();
    });
  });

  describe('createSurvey', () => {
    it('should create survey successfully', async () => {
      const surveyData = {
        title: 'New Survey',
        description: 'New description',
        event_id: 'event-123',
        created_by: 'user-123',
        questions: [],
        is_active: true,
        is_open: true,
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockSurvey, ...surveyData },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await SurveyService.createSurvey(surveyData);

      expect(result.survey).toBeDefined();
      expect(result.survey!.title).toBe('New Survey');
      expect(result.error).toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('surveys');
    });

    it('should handle creation errors', async () => {
      const surveyData = {
        title: 'New Survey',
        event_id: 'event-123',
        created_by: 'user-123',
      };

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

      const result = await SurveyService.createSurvey(surveyData);

      expect(result.error).toBe('Creation failed');
      expect(result.survey).toBeUndefined();
    });
  });

  describe('updateSurvey', () => {
    it('should update survey successfully', async () => {
      const updates = { title: 'Updated Survey Title' };
      const updatedSurvey = { ...mockSurvey, ...updates };

      // Mock get old survey
      const mockSelectOld = vi.fn().mockReturnThis();
      const mockEqOld = vi.fn().mockReturnThis();
      const mockSingleOld = vi.fn().mockResolvedValue({
        data: mockSurvey,
        error: null,
      });

      // Mock update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: updatedSurvey,
        error: null,
      });

      let callCount = 0;
      (supabase.from as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: get old survey
          return {
            select: mockSelectOld,
            eq: mockEqOld,
            single: mockSingleOld,
          };
        } else {
          // Second call: update survey
          return {
            update: mockUpdate,
            select: mockSelect,
            eq: mockEq,
            single: mockSingle,
          };
        }
      });

      const result = await SurveyService.updateSurvey('survey-123', updates);

      expect(result.survey).toBeDefined();
      expect(result.survey!.title).toBe('Updated Survey Title');
      expect(result.error).toBeUndefined();
    });

    it('should handle update errors', async () => {
      const updates = { title: 'Updated Title' };

      // Mock get old survey
      const mockSelectOld = vi.fn().mockReturnThis();
      const mockEqOld = vi.fn().mockReturnThis();
      const mockSingleOld = vi.fn().mockResolvedValue({
        data: mockSurvey,
        error: null,
      });

      // Mock update error
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
        } else {
          return {
            update: mockUpdate,
            select: mockSelect,
            eq: mockEq,
            single: mockSingle,
          };
        }
      });

      const result = await SurveyService.updateSurvey('survey-123', updates);

      expect(result.error).toBe('Update failed');
      expect(result.survey).toBeUndefined();
    });
  });

  describe('deleteSurvey', () => {
    it('should delete survey successfully', async () => {
      // Mock get old survey
      const mockSelectOld = vi.fn().mockReturnThis();
      const mockEqOld = vi.fn().mockReturnThis();
      const mockSingleOld = vi.fn().mockResolvedValue({
        data: mockSurvey,
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
        } else {
          return {
            delete: mockDelete,
            eq: mockEq,
          };
        }
      });

      const result = await SurveyService.deleteSurvey('survey-123');

      expect(result.error).toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('surveys');
    });

    it('should handle deletion errors', async () => {
      // Mock get old survey
      const mockSelectOld = vi.fn().mockReturnThis();
      const mockEqOld = vi.fn().mockReturnThis();
      const mockSingleOld = vi.fn().mockResolvedValue({
        data: mockSurvey,
        error: null,
      });

      // Mock delete error
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: { message: 'Deletion failed' },
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
        } else {
          return {
            delete: mockDelete,
            eq: mockEq,
          };
        }
      });

      const result = await SurveyService.deleteSurvey('survey-123');

      expect(result.error).toBe('Deletion failed');
    });
  });

  describe('getSurveysByEvent', () => {
    it('should return surveys for event successfully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockSurvey],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await SurveyService.getSurveysByEvent('event-123');

      expect(result.surveys).toBeDefined();
      expect(result.surveys).toHaveLength(1);
      expect(result.surveys![0]).toEqual(mockSurvey);
      expect(result.error).toBeUndefined();
    });

    it('should handle errors when fetching surveys by event', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await SurveyService.getSurveysByEvent('event-123');

      expect(result.error).toBe('Database error');
      expect(result.surveys).toBeUndefined();
    });
  });
});

