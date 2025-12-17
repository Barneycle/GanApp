import { supabase } from '../lib/supabaseClient';
import { logActivity, createActivityDetails } from '../utils/activityLogger';
import { LoggerService } from './loggerService';

export interface Survey {
  id: string;
  title: string;
  description: string;
  event_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  questions: any[];
  is_active: boolean;
  // Google Forms-like availability control
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
}

export class SurveyService {
  static async getAllSurveys(): Promise<{ surveys?: Survey[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { surveys: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getSurveyById(id: string): Promise<{ survey?: Survey; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { error: error.message };
      }

      // Auto-open/close based on schedule before returning
      // Only auto-open/close if not manually controlled
      if (data) {
        // Store original state before auto-open/close checks
        const wasOpen = data.is_open;

        await this.autoOpenScheduledSurveys(data);
        await this.autoCloseScheduledSurveys(data);

        // Only reload if the state actually changed (to avoid unnecessary DB calls)
        // and only if there's a schedule
        if ((data.opens_at || data.closes_at) && wasOpen !== data.is_open) {
          const { data: updatedData, error: updateError } = await supabase
            .from('surveys')
            .select('*')
            .eq('id', id)
            .single();

          if (!updateError && updatedData) {
            return { survey: updatedData };
          }
        }
      }

      return { survey: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async createSurvey(surveyData: Partial<Survey>): Promise<{ survey?: Survey; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .insert([surveyData])
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      // Log activity
      if (data && surveyData.created_by) {
        logActivity(
          surveyData.created_by,
          'create',
          'survey',
          {
            resourceId: data.id,
            resourceName: data.title || 'Untitled Survey',
            details: { survey_id: data.id, title: data.title, event_id: data.event_id }
          }
        ).catch(err => LoggerService.serviceError('SurveyService', 'Failed to log survey creation', err));
      }

      return { survey: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateSurvey(id: string, updates: Partial<Survey>): Promise<{ survey?: Survey; error?: string }> {
    try {
      // Get old survey data for activity logging
      const { data: oldSurvey } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('surveys')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      // Log activity
      if (data && oldSurvey) {
        const changedFields = Object.keys(updates).filter(key => updates[key as keyof Survey] !== oldSurvey[key as keyof Survey]);
        logActivity(
          data.created_by || oldSurvey.created_by,
          'update',
          'survey',
          {
            resourceId: data.id,
            resourceName: data.title || 'Untitled Survey',
            details: createActivityDetails(oldSurvey, data, changedFields)
          }
        ).catch(err => LoggerService.serviceError('SurveyService', 'Failed to log survey update', err));
      }

      return { survey: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async deleteSurvey(id: string): Promise<{ error?: string }> {
    try {
      // Get survey data before deletion for activity logging
      const { data: oldSurvey } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id);

      if (error) {
        return { error: error.message };
      }

      // Log activity
      if (oldSurvey) {
        logActivity(
          oldSurvey.created_by,
          'delete',
          'survey',
          {
            resourceId: oldSurvey.id,
            resourceName: oldSurvey.title || 'Untitled Survey',
            details: createActivityDetails(oldSurvey, null)
          }
        ).catch(err => LoggerService.serviceError('SurveyService', 'Failed to log survey deletion', err));
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getSurveysByEvent(eventId: string): Promise<{ surveys?: Survey[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { surveys: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get survey by event ID with comprehensive security validation (for mobile app compatibility)
   */
  static async getSurveyByEventId(
    eventId: string,
    userId: string
  ): Promise<{ survey?: Survey; error?: string; availabilityInfo?: any; validationInfo?: any }> {
    try {
      // Step 1: Event Validation
      const eventValidation = await this.validateEventAccess(eventId, userId);
      if (eventValidation.error) {
        return {
          error: eventValidation.error,
          validationInfo: { step: 'event_validation', failed: true }
        };
      }

      // Step 2: Attendance Verification
      const attendanceCheck = await this.checkUserAttendance(eventId, userId);
      if (attendanceCheck.error) {
        return {
          error: attendanceCheck.error,
          validationInfo: { step: 'attendance_verification', failed: true }
        };
      }

      if (!attendanceCheck.isCheckedIn) {
        return {
          error: 'You must check in to this event before accessing the survey. Please scan the QR code at the event venue.',
          validationInfo: { step: 'attendance_verification', failed: true, reason: 'not_checked_in' }
        };
      }

      // Step 3: Get survey
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: 'No survey is available for this event yet.',
            validationInfo: { step: 'survey_retrieval', failed: true, reason: 'not_found' }
          };
        }
        return {
          error: error.message,
          validationInfo: { step: 'survey_retrieval', failed: true }
        };
      }

      // Step 4: Cross-Reference Validation
      if (data.event_id !== eventId) {
        return {
          error: 'Survey does not belong to the specified event.',
          validationInfo: { step: 'cross_reference', failed: true, reason: 'event_mismatch' }
        };
      }

      // Step 5: Availability Validation
      const availabilityCheck = await this.checkSurveyAvailability(data);
      if (!availabilityCheck.isAvailable) {
        return {
          error: availabilityCheck.error,
          availabilityInfo: availabilityCheck.info,
          validationInfo: { step: 'availability_check', failed: true }
        };
      }

      return {
        survey: data,
        availabilityInfo: availabilityCheck.info,
        validationInfo: {
          step: 'complete',
          passed: true,
          eventId: eventValidation.event?.id,
          attendanceLogId: attendanceCheck.attendanceLog?.id
        }
      };
    } catch (error) {
      return {
        error: 'An unexpected error occurred during survey validation',
        validationInfo: { step: 'exception', failed: true }
      };
    }
  }

  // Helper methods for validation (same as mobile app)
  private static async validateEventAccess(eventId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, status, start_date, end_date, start_time, end_time')
        .eq('id', eventId)
        .eq('status', 'published')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { error: 'Event not found or not accessible. The event may not be published yet.' };
        }
        return { error: error.message };
      }

      const now = new Date();
      const eventEndDateTime = new Date(`${data.end_date}T${data.end_time}`);

      if (now > eventEndDateTime) {
        return { error: 'This event has already ended. Survey access is no longer available.' };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred while validating event access' };
    }
  }

  private static async checkUserAttendance(eventId: string, userId: string) {
    try {
      // For multi-day events, get the most recent check-in (or today's if available)
      // First try to get today's check-in
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCheckIn, error: todayError } = await supabase
        .from('attendance_logs')
        .select('id, check_in_time, check_in_date, check_in_method, is_validated, event_id, user_id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('check_in_date', today)
        .maybeSingle();

      // If today's check-in exists, use it; otherwise get the most recent one
      let data = todayCheckIn;
      let error = todayError;

      if (!data || error) {
        // Fallback: get the most recent check-in
        const { data: recentCheckIn, error: recentError } = await supabase
          .from('attendance_logs')
          .select('id, check_in_time, check_in_date, check_in_method, is_validated, event_id, user_id')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .order('check_in_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        data = recentCheckIn;
        error = recentError;
      }

      if (error && error.code !== 'PGRST116') {
        return { isCheckedIn: false, error: error.message };
      }

      if (!data) {
        return {
          isCheckedIn: false,
          error: 'You are not registered for this event. Please register first before checking in.'
        };
      }

      if (!data.check_in_time) {
        return {
          isCheckedIn: false,
          error: 'You are registered but have not checked in yet. Please scan the QR code at the event venue to check in.'
        };
      }

      if (data.event_id !== eventId) {
        return {
          isCheckedIn: false,
          error: 'Attendance record does not match the requested event. Please contact support.'
        };
      }

      // IMPORTANT: Check if the attendance is validated
      if (!data.is_validated) {
        return {
          isCheckedIn: false,
          error: 'Your attendance has not been validated yet. Please contact the event organizer to validate your check-in before accessing the survey.'
        };
      }

      return { isCheckedIn: true, attendanceLog: data };
    } catch (error) {
      return { isCheckedIn: false, error: 'An unexpected error occurred while checking attendance' };
    }
  }

  /**
   * Auto-open surveys when opens_at time arrives
   * This should be called before checking availability
   * Respects manual closes - won't auto-open if survey was manually closed
   */
  private static async autoOpenScheduledSurveys(survey: Survey): Promise<void> {
    if (!survey.is_active || survey.is_open) {
      return; // Already open or inactive, no need to check
    }

    if (survey.opens_at) {
      // Parse the opens_at time (stored as UTC ISO string)
      const opensAt = new Date(survey.opens_at);
      const now = new Date();

      // Debug logging
      LoggerService.debug('Auto-open check', {
        surveyId: survey.id,
        opensAt: opensAt.toISOString(),
        now: now.toISOString(),
        shouldOpen: now >= opensAt,
      });

      // If opens_at time has arrived, check if we should auto-open
      if (now >= opensAt) {
        // Check if the survey was manually closed after the opens_at time
        // If updated_at is after opens_at, it means the user manually closed it
        // and we should respect that manual close
        if (survey.updated_at) {
          const updatedAt = new Date(survey.updated_at);
          // If the survey was updated (manually closed) after the opens_at time,
          // don't auto-open it - respect the manual close
          if (updatedAt > opensAt) {
            LoggerService.debug('Survey was manually closed after opens_at time, respecting manual close', { surveyId: survey.id });
            return;
          }
        }

        // Only auto-open if opens_at time has passed AND the survey wasn't manually closed after that time
        try {
          const { error } = await supabase
            .from('surveys')
            .update({ is_open: true })
            .eq('id', survey.id);

          if (error) {
            LoggerService.serviceError('SurveyService', 'Failed to auto-open survey', error);
          } else {
            LoggerService.debug('Survey auto-opened', { surveyId: survey.id });
            // Update the survey object in memory
            survey.is_open = true;
          }
        } catch (error) {
          LoggerService.serviceError('SurveyService', 'Failed to auto-open survey', error);
        }
      }
    }
  }

  /**
   * Auto-close surveys when closes_at time passes
   * This should be called before checking availability
   * Respects manual opens - if survey was manually opened after closes_at, don't auto-close
   */
  private static async autoCloseScheduledSurveys(survey: Survey): Promise<void> {
    if (!survey.is_active || !survey.is_open) {
      return; // Already closed or inactive, no need to check
    }

    if (survey.closes_at) {
      const closesAt = new Date(survey.closes_at);
      const now = new Date();

      // If closes_at time has passed, check if we should auto-close
      if (now > closesAt) {
        // Check if the survey was manually opened after the closes_at time
        // If updated_at is after closes_at, it means the user manually opened it
        // and we should respect that manual open
        if (survey.updated_at) {
          const updatedAt = new Date(survey.updated_at);
          // If the survey was updated (manually opened) after the closes_at time,
          // don't auto-close it - respect the manual open
          if (updatedAt > closesAt) {
            LoggerService.debug('Survey was manually opened after closes_at time, respecting manual open', { surveyId: survey.id });
            return;
          }
        }

        // Only auto-close if closes_at time has passed AND the survey wasn't manually opened after that time
        try {
          const { error } = await supabase
            .from('surveys')
            .update({ is_open: false })
            .eq('id', survey.id);

          if (error) {
            LoggerService.serviceError('SurveyService', 'Failed to auto-close survey', error);
          } else {
            LoggerService.debug('Survey auto-closed', { surveyId: survey.id });
            // Update the survey object in memory
            survey.is_open = false;
          }
        } catch (error) {
          LoggerService.serviceError('SurveyService', 'Failed to auto-close survey', error);
        }
      }
    }
  }

  private static async checkSurveyAvailability(survey: Survey) {
    // Auto-open/close based on schedule before checking availability
    await this.autoOpenScheduledSurveys(survey);
    await this.autoCloseScheduledSurveys(survey);

    if (!survey.is_active) {
      return {
        isAvailable: false,
        error: 'This survey is not active.',
        info: { status: 'inactive' }
      };
    }

    if (!survey.is_open) {
      // Check if it's scheduled to open in the future
      if (survey.opens_at) {
        const opensAt = new Date(survey.opens_at);
        const now = new Date();
        if (now < opensAt) {
          return {
            isAvailable: false,
            error: `Survey will be available starting ${opensAt.toLocaleString()}`,
            info: {
              status: 'scheduled_to_open',
              opensAt: survey.opens_at
            }
          };
        }
      }

      return {
        isAvailable: false,
        error: 'This survey is currently closed. The organizer will open it when ready.',
        info: {
          status: 'closed_by_organizer',
          message: 'Survey is closed by the event organizer'
        }
      };
    }

    if (survey.opens_at) {
      const opensAt = new Date(survey.opens_at);
      const now = new Date();

      if (now < opensAt) {
        return {
          isAvailable: false,
          error: `Survey will be available starting ${opensAt.toLocaleString()}`,
          info: {
            status: 'scheduled_to_open',
            opensAt: survey.opens_at
          }
        };
      }
    }

    if (survey.closes_at) {
      const closesAt = new Date(survey.closes_at);
      const now = new Date();

      if (now > closesAt) {
        return {
          isAvailable: false,
          error: `Survey closed on ${closesAt.toLocaleString()}`,
          info: {
            status: 'closed_by_schedule',
            closesAt: survey.closes_at
          }
        };
      }
    }

    return {
      isAvailable: true,
      info: {
        status: 'available',
        opensAt: survey.opens_at,
        closesAt: survey.closes_at
      }
    };
  }

  static async getSurveysByCreator(creatorId: string): Promise<{ surveys?: Survey[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('created_by', creatorId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { surveys: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  // Google Forms-like availability control methods
  static async openSurvey(surveyId: string): Promise<{ error?: string }> {
    try {
      // Explicitly set updated_at to track manual open
      const { error } = await supabase
        .from('surveys')
        .update({
          is_open: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', surveyId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async closeSurvey(surveyId: string): Promise<{ error?: string }> {
    try {
      // Explicitly set updated_at to track manual close
      const { error } = await supabase
        .from('surveys')
        .update({
          is_open: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', surveyId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async toggleSurveyAvailability(surveyId: string): Promise<{ isOpen?: boolean; error?: string }> {
    try {
      // First get current state
      const { data: currentSurvey, error: fetchError } = await supabase
        .from('surveys')
        .select('is_open')
        .eq('id', surveyId)
        .single();

      if (fetchError) {
        return { error: fetchError.message };
      }

      const newState = !currentSurvey.is_open;

      // Update to opposite state
      // Explicitly set updated_at to current time to track manual changes
      const { error } = await supabase
        .from('surveys')
        .update({
          is_open: newState,
          updated_at: new Date().toISOString()
        })
        .eq('id', surveyId);

      if (error) {
        return { error: error.message };
      }

      return { isOpen: newState };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async scheduleSurvey(
    surveyId: string,
    opensAt?: string | null,
    closesAt?: string | null
  ): Promise<{ error?: string }> {
    try {
      const updates: any = {};

      // Explicitly handle null values to allow clearing schedules
      // If opensAt is explicitly null or empty string, clear it
      if (opensAt === null || opensAt === '') {
        updates.opens_at = null;
      } else if (opensAt) {
        updates.opens_at = opensAt;
      }
      // If closesAt is explicitly null or empty string, clear it
      if (closesAt === null || closesAt === '') {
        updates.closes_at = null;
      } else if (closesAt) {
        updates.closes_at = closesAt;
      }

      // Only update if we have at least one field to update
      if (Object.keys(updates).length === 0) {
        return {}; // No changes to make
      }

      // Don't automatically open the survey - let the schedule control availability
      // The survey availability is controlled by:
      // 1. is_open flag (manual control)
      // 2. opens_at and closes_at (automatic schedule control)
      // These work together in checkSurveyAvailability()

      const { error } = await supabase
        .from('surveys')
        .update(updates)
        .eq('id', surveyId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}
