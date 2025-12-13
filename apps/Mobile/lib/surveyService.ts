import { supabase } from './supabase';
import { logActivity } from './utils/activityLogger';

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

export interface SurveyResponse {
  id: string;
  survey_id: string;
  user_id: string;
  responses: Record<string, any>;
  created_at: string;
}

export class SurveyService {
  /**
   * Get survey by event ID with comprehensive security validation
   * 1. Event Validation: Verifies event exists, is published, and hasn't ended
   * 2. Attendance Verification: Ensures user is checked into the specific event
   * 3. Cross-Reference Validation: Double-checks survey belongs to the event
   * 4. User Context: Requires authenticated user ID
   * 5. Availability Validation: Google Forms-like availability control
   */
  static async getSurveyByEventId(
    eventId: string, 
    userId: string
  ): Promise<{ survey?: Survey; error?: string; availabilityInfo?: any; validationInfo?: any }> {
    try {
      // Step 1: Event Validation - Verify event exists, is published, and hasn't ended
      const eventValidation = await this.validateEventAccess(eventId, userId);
      if (eventValidation.error) {
        return { 
          error: eventValidation.error,
          validationInfo: { step: 'event_validation', failed: true }
        };
      }

      // Step 2: Registration Verification - Ensure user is registered for this event
      // Note: We only require registration, not check-in, for evaluations
      const registrationCheck = await this.checkUserRegistration(eventId, userId);
      if (registrationCheck.error) {
        return { 
          error: registrationCheck.error,
          validationInfo: { step: 'registration_verification', failed: true }
        };
      }
      
      if (!registrationCheck.isRegistered) {
        return { 
          error: 'You are not registered for this event. Please register first before accessing the evaluation.',
          validationInfo: { step: 'registration_verification', failed: true, reason: 'not_registered' }
        };
      }

      // Step 3: Get survey for this specific event
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
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

      // Step 4: Cross-Reference Validation - Ensure survey belongs to the requested event
      if (data.event_id !== eventId) {
        return { 
          error: 'Survey does not belong to the specified event.',
          validationInfo: { step: 'cross_reference', failed: true, reason: 'event_mismatch' }
        };
      }

      // Step 5: Availability Validation - Google Forms-like availability control
      const availabilityCheck = this.checkSurveyAvailability(data);
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
          isRegistered: registrationCheck.isRegistered
        }
      };
    } catch (error) {
      return { 
        error: 'An unexpected error occurred during survey validation',
        validationInfo: { step: 'exception', failed: true }
      };
    }
  }

  /**
   * Event Validation: Verifies event exists, is published, and hasn't ended
   */
  private static async validateEventAccess(
    eventId: string, 
    userId: string
  ): Promise<{ event?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, status, start_date, end_date, start_time, end_time')
        .eq('id', eventId)
        .eq('status', 'published')  // Only allow access to published events
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return { error: 'Event not found or not accessible. The event may not be published yet.' };
        }
        return { error: error.message };
      }

      // Additional validation: Check if event has ended
      const now = new Date();
      const eventEndDateTime = new Date(`${data.end_date}T${data.end_time}`);
      
      if (now > eventEndDateTime) {
        return { error: 'This event has already ended. Survey access is no longer available.' };
      }

      // Validate event dates are reasonable
      const eventStartDateTime = new Date(`${data.start_date}T${data.start_time}`);
      if (eventEndDateTime < eventStartDateTime) {
        return { error: 'Invalid event configuration. Please contact the event organizer.' };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred while validating event access' };
    }
  }

  /**
   * Registration Verification: Ensures user is registered for the event
   * This is used for evaluation access - registered users can take evaluations
   */
  private static async checkUserRegistration(
    eventId: string, 
    userId: string
  ): Promise<{ isRegistered: boolean; registration?: any; error?: string }> {
    try {
      // Check if user is registered for this event (using same method as EventService.getUserRegistration)
      const { data: registration, error: registrationError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'registered')
        .maybeSingle();

      if (registrationError) {
        // Log the error for debugging
        console.error('Registration check error:', registrationError);
        // If it's not a "not found" error, return the error message
        if (registrationError.code !== 'PGRST116') {
          return { isRegistered: false, error: registrationError.message };
        }
        // If it's "not found" (PGRST116), user is not registered
        return { 
          isRegistered: false, 
          error: 'You are not registered for this event. Please register first before accessing the evaluation.' 
        };
      }

      // If user is not registered, return appropriate error
      if (!registration) {
        return { 
          isRegistered: false, 
          error: 'You are not registered for this event. Please register first before accessing the evaluation.' 
        };
      }

      // User is registered
      return { 
        isRegistered: true, 
        registration: registration 
      };
    } catch (error) {
      console.error('Unexpected error checking registration:', error);
      return { isRegistered: false, error: 'An unexpected error occurred while checking registration' };
    }
  }

  /**
   * Check if survey is currently available (like Google Forms)
   */
  private static checkSurveyAvailability(survey: Survey): { 
    isAvailable: boolean; 
    error?: string; 
    info?: any 
  } {
    // Survey must be active
    if (!survey.is_active) {
      return {
        isAvailable: false,
        error: 'This survey is not active.',
        info: { status: 'inactive' }
      };
    }

    // Survey must be opened by organizer (Google Forms-like control)
    if (!survey.is_open) {
      return {
        isAvailable: false,
        error: 'This survey is currently closed. The organizer will open it when ready.',
        info: { 
          status: 'closed_by_organizer',
          message: 'Survey is closed by the event organizer'
        }
      };
    }

    // Check if survey has specific open time set
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

    // Check if survey has specific close time set
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

    // Survey is available
    return {
      isAvailable: true,
      info: { 
        status: 'available',
        opensAt: survey.opens_at,
        closesAt: survey.closes_at
      }
    };
  }

  /**
   * Organizer methods for survey availability management (like Google Forms)
   */
  static async openSurvey(surveyId: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('surveys')
        .update({ is_open: true })
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
      const { error } = await supabase
        .from('surveys')
        .update({ is_open: false })
        .eq('id', surveyId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async scheduleSurvey(
    surveyId: string, 
    opensAt?: string, 
    closesAt?: string
  ): Promise<{ error?: string }> {
    try {
      const updates: any = {};
      
      if (opensAt) updates.opens_at = opensAt;
      if (closesAt) updates.closes_at = closesAt;
      
      // If scheduling, automatically open the survey
      if (opensAt || closesAt) {
        updates.is_open = true;
      }

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
      const { error } = await supabase
        .from('surveys')
        .update({ is_open: newState })
        .eq('id', surveyId);

      if (error) {
        return { error: error.message };
      }

      return { isOpen: newState };
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

      return { survey: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async submitSurveyResponse(
    surveyId: string, 
    userId: string, 
    responses: Record<string, any>
  ): Promise<{ response?: SurveyResponse; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .insert([{
          survey_id: surveyId,
          user_id: userId,
          responses: responses
        }])
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { response: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async checkExistingResponse(
    surveyId: string, 
    userId: string
  ): Promise<{ hasResponse: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('survey_id', surveyId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        return { hasResponse: false, error: error.message };
      }

      return { hasResponse: !!data };
    } catch (error) {
      return { hasResponse: false, error: 'An unexpected error occurred' };
    }
  }

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
        ).catch(err => console.error('Failed to log survey creation:', err));
      }

      return { survey: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateSurvey(id: string, updates: Partial<Survey>): Promise<{ survey?: Survey; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { survey: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async deleteSurvey(id: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id);

      if (error) {
        return { error: error.message };
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
}

