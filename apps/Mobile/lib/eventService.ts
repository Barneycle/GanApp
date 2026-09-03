import { supabase } from './supabase';
import { NetworkStatusMonitor } from './offline/networkStatus';
import { LocalDatabaseService } from './offline/localDatabase';
import { SyncQueueService, SyncPriority } from './offline/syncQueue';
import { DataType } from './offline/conflictResolution';

export interface Event {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  status: 'draft' | 'published' | 'cancelled';
  rationale?: string;
  banner_url?: string;
  max_participants?: number;
  current_participants?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  event_kits_url?: string;
  event_programmes_url?: string;
  materials_url?: string;
  programme_url?: string;
  registration_deadline?: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: 'registered' | 'cancelled' | 'attended';
  created_at: string;
}

export class EventService {
  static async getPublishedEvents(): Promise<{ events: Event[]; error?: string; fromCache?: boolean }> {
    try {
      // Try to fetch from server if online
      if (NetworkStatusMonitor.isOnline()) {
        try {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('status', 'published')
            .order('start_date', { ascending: true });

          if (error) {
            console.error('Error fetching published events:', error);
            // Fall through to cache
          } else if (data) {
            // Save to local database
            for (const event of data) {
              await LocalDatabaseService.saveEvent(event);
            }
            return { events: data || [], error: undefined, fromCache: false };
          }
        } catch (error) {
          console.error('Network error, falling back to cache:', error);
          // Fall through to cache
        }
      }

      // Fallback to local database
      const cachedEvents = await LocalDatabaseService.getEvents('published');
      return { events: cachedEvents || [], error: undefined, fromCache: true };
    } catch (error) {
      console.error('Unexpected error in getPublishedEvents:', error);
      return { events: [], error: 'An unexpected error occurred' };
    }
  }

  /**
   * Fetch events for the browse/events screen (published + cancelled),
   * categorized client-side into upcoming/ongoing/past/cancelled like the web UI.
   */
  static async getBrowseEvents(): Promise<{ events: Event[]; error?: string; fromCache?: boolean }> {
    try {
      // Try to fetch from server if online
      if (NetworkStatusMonitor.isOnline()) {
        try {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .in('status', ['published', 'cancelled'])
            .order('start_date', { ascending: true });

          if (error) {
            console.error('Error fetching browse events:', error);
            // Fall through to cache
          } else if (data) {
            // Save to local database
            for (const event of data) {
              await LocalDatabaseService.saveEvent(event);
            }
            return { events: data || [], error: undefined, fromCache: false };
          }
        } catch (error) {
          console.error('Network error, falling back to cache:', error);
          // Fall through to cache
        }
      }

      // Fallback to local database (we can’t query multiple statuses in SQLite helper, so filter in JS)
      const cachedEvents = await LocalDatabaseService.getEvents();
      const filtered = (cachedEvents || []).filter((e: any) => e?.status === 'published' || e?.status === 'cancelled');
      return { events: filtered, error: undefined, fromCache: true };
    } catch (error) {
      console.error('Unexpected error in getBrowseEvents:', error);
      return { events: [], error: 'An unexpected error occurred' };
    }
  }

  static async getEventsByCreator(creatorId: string): Promise<{ events: Event[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', creatorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching events by creator:', error);
        return { events: [], error: error.message };
      }

      return { events: data || [], error: undefined };
    } catch (error) {
      console.error('Unexpected error in getEventsByCreator:', error);
      return { events: [], error: 'An unexpected error occurred' };
    }
  }

  static async getEventById(eventId: string): Promise<{ event: Event | null; error?: string; fromCache?: boolean }> {
    try {
      // Try to fetch from server if online
      if (NetworkStatusMonitor.isOnline()) {
        try {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .maybeSingle();

          if (error) {
            console.error('Error fetching event by ID:', error);
            // Fall through to cache
          } else if (data) {
            // Save to local database
            await LocalDatabaseService.saveEvent(data);
            return { event: data, error: undefined, fromCache: false };
          }
        } catch (error) {
          console.error('Network error, falling back to cache:', error);
          // Fall through to cache
        }
      }

      // Fallback to local database
      const cachedEvent = await LocalDatabaseService.getEventById(eventId);
      return { event: cachedEvent, error: undefined, fromCache: true };
    } catch (error) {
      console.error('Unexpected error in getEventById:', error);
      return { event: null, error: 'An unexpected error occurred' };
    }
  }

  static async createEvent(eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<{ event: Event | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        return { event: null, error: error.message };
      }

      return { event: data, error: undefined };
    } catch (error) {
      console.error('Unexpected error in createEvent:', error);
      return { event: null, error: 'An unexpected error occurred' };
    }
  }

  static async updateEvent(eventId: string, updates: Partial<Event>): Promise<{ event: Event | null; error?: string; queued?: boolean }> {
    try {
      // Get current event data
      const currentEvent = await this.getEventById(eventId);
      if (!currentEvent.event) {
        return { event: null, error: 'Event not found' };
      }

      const updatedEvent = { ...currentEvent.event, ...updates, updated_at: new Date().toISOString() };

      // If online, try to update immediately
      if (NetworkStatusMonitor.isOnline()) {
        try {
          const { data, error } = await supabase
            .from('events')
            .update(updates)
            .eq('id', eventId)
            .select()
            .single();

          if (error) {
            console.error('Error updating event:', error);
            // Queue for later
          } else if (data) {
            await LocalDatabaseService.saveEvent(data);
            return { event: data, error: undefined, queued: false };
          }
        } catch (error) {
          console.error('Network error, queueing update:', error);
          // Fall through to queue
        }
      }

      // Queue update for sync
      await SyncQueueService.enqueue(
        DataType.EVENT_METADATA,
        'update',
        'events',
        updatedEvent,
        SyncPriority.MEDIUM
      );

      // Save to local database immediately
      await LocalDatabaseService.saveEvent(updatedEvent);

      return { event: updatedEvent, error: undefined, queued: true };
    } catch (error) {
      console.error('Unexpected error in updateEvent:', error);
      return { event: null, error: 'An unexpected error occurred' };
    }
  }

  static async deleteEvent(eventId: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        return { error: error.message };
      }

      return { error: undefined };
    } catch (error) {
      console.error('Unexpected error in deleteEvent:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getUserRegistrations(userId: string): Promise<{ registrations?: Array<{ events: Event; registration_date: string; registration_id: string }>; error?: string; fromCache?: boolean }> {
    try {
      // Try to fetch from server if online
      if (NetworkStatusMonitor.isOnline()) {
        try {
          const { data, error } = await supabase
            .from('event_registrations')
            .select(`
              id,
              registration_date,
              created_at,
              events (*)
            `)
            .eq('user_id', userId)
            .eq('status', 'registered')
            .order('registration_date', { ascending: false });

          if (error) {
            console.error('Error fetching user registrations:', error);
            // Fall through to cache
          } else if (data) {
            // Save registrations to local database
            for (const registration of data) {
              if (registration.events) {
                await LocalDatabaseService.saveEvent(registration.events as any);
              }
              await LocalDatabaseService.saveEventRegistration({
                id: registration.id,
                event_id: (registration.events as any)?.id || '',
                user_id: userId,
                status: 'registered',
                registration_date: registration.registration_date || registration.created_at?.split('T')[0],
                created_at: registration.created_at,
              });
            }

            // Filter out any registrations where the event is null (deleted events)
            const validRegistrations = data.filter(registration => registration.events !== null);

            if (validRegistrations.length === 0) {
              return { registrations: [], error: undefined, fromCache: false };
            }

            const registrations = validRegistrations.map(registration => ({
              events: registration.events as unknown as Event,
              registration_date: registration.registration_date || registration.created_at,
              registration_id: registration.id
            }));

            return { registrations, error: undefined, fromCache: false };
          }
        } catch (error) {
          console.error('Network error, falling back to cache:', error);
          // Fall through to cache
        }
      }

      // Fallback to local database
      const localRegistrations = await LocalDatabaseService.getEventRegistrations(undefined, userId);
      const registered = localRegistrations.filter(r => r.status === 'registered');

      const registrations: Array<{ events: Event; registration_date: string; registration_id: string }> = [];

      for (const reg of registered) {
        const event = await LocalDatabaseService.getEventById(reg.event_id);
        if (event) {
          registrations.push({
            events: event,
            registration_date: reg.registration_date || reg.created_at?.split('T')[0] || '',
            registration_id: reg.id,
          });
        }
      }

      return { registrations, error: undefined, fromCache: true };
    } catch (error) {
      console.error('Unexpected error in getUserRegistrations:', error);
      return { registrations: [], error: 'An unexpected error occurred' };
    }
  }

  static async getFeaturedEvent(): Promise<{ event?: Event; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_featured', true)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getUserRegistration(eventId: string, userId: string): Promise<{ registration?: EventRegistration; error?: string; fromCache?: boolean }> {
    try {
      // Try to fetch from server if online
      if (NetworkStatusMonitor.isOnline()) {
        try {
          const { data, error } = await supabase
            .from('event_registrations')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .eq('status', 'registered')
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            // Fall through to cache for other errors
          } else if (data) {
            // Save to local database
            await LocalDatabaseService.saveEventRegistration({
              id: data.id,
              event_id: data.event_id,
              user_id: data.user_id,
              status: data.status,
              registration_date: data.registration_date || data.created_at?.split('T')[0],
              created_at: data.created_at,
            });
            return { registration: data, fromCache: false };
          }
        } catch (error) {
          console.error('Network error, falling back to cache:', error);
          // Fall through to cache
        }
      }

      // Fallback to local database
      const localRegistrations = await LocalDatabaseService.getEventRegistrations(eventId, userId);
      const registration = localRegistrations.find(r => r.status === 'registered');

      if (!registration) {
        return { fromCache: true };
      }

      return { registration: registration as EventRegistration, fromCache: true };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async registerForEvent(eventId: string, userId: string): Promise<{ registration?: EventRegistration; error?: string; queued?: boolean }> {
    try {
      // Check if user is already registered (active registration)
      const existingRegistration = await this.getUserRegistration(eventId, userId);
      if (existingRegistration.registration) {
        return { error: 'You are already registered for this event' };
      }

      // Check if event exists and is published (use cached if offline)
      const eventResult = await this.getEventById(eventId);
      if (eventResult.error) {
        return { error: eventResult.error };
      }

      if (!eventResult.event) {
        return { error: 'Event not found' };
      }

      if (eventResult.event.status !== 'published') {
        return { error: 'This event is not available for registration' };
      }

      // Check if registration is open for this event
      if (eventResult.event.registration_open === false) {
        return { error: 'Registration closed: Event organizer has closed registration' };
      }

      // Check if event is past (ended)
      const now = new Date();
      const endDateTime = new Date(`${eventResult.event.end_date}T${eventResult.event.end_time || '23:59:59'}`);
      if (endDateTime < now) {
        return { error: 'Registration closed: Event has ended' };
      }

      // Check if event has reached max participants
      if (eventResult.event.max_participants && eventResult.event.current_participants && eventResult.event.current_participants >= eventResult.event.max_participants) {
        return { error: 'This event has reached maximum capacity' };
      }

      // If offline, queue registration and save locally
      if (!NetworkStatusMonitor.isOnline()) {
        // Check if THIS USER has a cancelled registration that we can reactivate
        const localRegistrations = await LocalDatabaseService.getEventRegistrations(eventId, userId);
        const cancelledRegistration = localRegistrations.find(r => r.status === 'cancelled');

        const registrationId = cancelledRegistration?.id || `local-reg-${Date.now()}-${Math.random()}`;
        const registrationData = {
          id: registrationId,
          event_id: eventId,
          user_id: userId,
          status: 'registered',
          registration_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        };

        // Save to local database
        await LocalDatabaseService.saveEventRegistration(registrationData);

        // Queue for sync (server wins for registrations)
        await SyncQueueService.enqueue(
          DataType.EVENT_REGISTRATION,
          cancelledRegistration ? 'update' : 'create',
          'event_registrations',
          registrationData,
          SyncPriority.HIGH
        );

        // Send notification when online (will be sent on sync)
        // For now, create a local notification
        try {
          const { NotificationService } = await import('./notificationService');
          await NotificationService.createNotification(
            userId,
            'Registration Queued',
            `Your registration for "${eventResult.event.title}" has been saved offline and will be confirmed when online.`,
            'info',
            {
              action_url: `/event-details?eventId=${eventId}`,
              action_text: 'View Event',
              priority: 'normal'
            }
          );
        } catch (err) {
          console.error('Failed to create registration notification:', err);
        }

        return { registration: registrationData as EventRegistration, queued: true };
      }

      // Online: Check if THIS USER has a cancelled registration that we can reactivate
      const { data: cancelledRegistration, error: cancelledError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'cancelled')
        .maybeSingle();

      // Create or reactivate registration
      let registrationData;
      let registrationError;

      if (cancelledRegistration) {
        // Reactivate cancelled registration
        const { data, error } = await supabase
          .from('event_registrations')
          .update({ status: 'registered' })
          .eq('id', cancelledRegistration.id)
          .select()
          .single();

        registrationData = data;
        registrationError = error;
      } else {
        // Create new registration
        const { data, error } = await supabase
          .from('event_registrations')
          .insert([{
            event_id: eventId,
            user_id: userId,
            status: 'registered'
          }])
          .select()
          .single();

        registrationData = data;
        registrationError = error;
      }

      if (registrationError) {
        console.error('Registration error:', registrationError);
        return { error: registrationError.message };
      }

      if (!registrationData) {
        console.error('Registration data is null after insert/update');
        return { error: 'Failed to create registration' };
      }

      // Save to local database
      await LocalDatabaseService.saveEventRegistration(registrationData);

      // Create registration confirmation notification
      try {
        const { NotificationService } = await import('./notificationService');
        await NotificationService.createRegistrationNotification(
          userId,
          eventResult.event.title,
          eventId
        );
      } catch (err) {
        // Notification creation failure shouldn't break registration
        console.error('Failed to create registration notification:', err);
      }

      // Update event participant count
      const currentCount = eventResult.event.current_participants || 0;
      const newCount = currentCount + 1;

      const { error: updateError } = await supabase
        .from('events')
        .update({
          current_participants: newCount
        })
        .eq('id', eventId);

      if (updateError) {
        console.warn('Failed to update participant count:', updateError);
        // Don't fail the registration if count update fails
      }

      return { registration: registrationData, queued: false };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Check if user has checked in to an event today (for multi-day event support)
   * Supports offline - checks local database
   */
  static async checkUserCheckInStatus(eventId: string, userId: string): Promise<{ isCheckedIn: boolean; isValidated?: boolean; error?: string; fromCache?: boolean }> {
    try {
      // Get current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Try server first if online
      if (NetworkStatusMonitor.isOnline()) {
        try {
          // First, check for any check-in (validated or not) for today
          const { data: todayCheckIn, error: todayError } = await supabase
            .from('attendance_logs')
            .select('id, check_in_time, check_in_date, is_validated')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .eq('check_in_date', today)
            .order('check_in_time', { ascending: false })
            .limit(1)
            .maybeSingle();

          // If no check-in today, check for most recent check-in (for multi-day events)
          let checkInData = todayCheckIn;
          if (!todayCheckIn && todayError?.code !== 'PGRST116') {
            const { data: recentCheckIn } = await supabase
              .from('attendance_logs')
              .select('id, check_in_time, check_in_date, is_validated')
              .eq('event_id', eventId)
              .eq('user_id', userId)
              .order('check_in_time', { ascending: false })
              .limit(1)
              .maybeSingle();
            checkInData = recentCheckIn;
          }

          if (checkInData) {
            // Save to local database
            await LocalDatabaseService.saveAttendanceLog({
              id: checkInData.id,
              event_id: eventId,
              user_id: userId,
              check_in_time: checkInData.check_in_time,
              check_in_date: checkInData.check_in_date || today,
              is_validated: checkInData.is_validated || false,
            });
            return {
              isCheckedIn: !!checkInData?.check_in_time,
              isValidated: checkInData?.is_validated || false,
              fromCache: false
            };
          }
        } catch (error) {
          console.error('Network error, falling back to cache:', error);
          // Fall through to cache
        }
      }

      // Fallback to local database
      const localAttendance = await LocalDatabaseService.getAttendanceLogs(eventId, userId);
      // Check for today's check-in first, then most recent
      const todayCheckIn = localAttendance.find(
        (att) => att.check_in_date === today
      );
      const checkInData = todayCheckIn || localAttendance[0];

      if (checkInData) {
        return {
          isCheckedIn: !!checkInData.check_in_time,
          isValidated: checkInData.is_validated || false,
          fromCache: true
        };
      }

      return { isCheckedIn: false, isValidated: false, fromCache: true };
    } catch (error) {
      return { isCheckedIn: false, isValidated: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Check if user has completed survey/evaluation for an event
   */
  static async checkUserSurveyCompletion(eventId: string, userId: string): Promise<{ isCompleted: boolean; error?: string }> {
    try {
      // Check survey_responses with join to surveys table
      const { data: surveyResponses, error: surveyError } = await supabase
        .from('survey_responses')
        .select(`
          id,
          surveys!inner(event_id)
        `)
        .eq('user_id', userId)
        .eq('surveys.event_id', eventId);

      if (surveyResponses && surveyResponses.length > 0) {
        return { isCompleted: true };
      }

      // Check evaluation_responses with join to evaluations table
      const { data: evaluationResponses, error: evalError } = await supabase
        .from('evaluation_responses')
        .select(`
          id,
          evaluations!inner(event_id)
        `)
        .eq('user_id', userId)
        .eq('evaluations.event_id', eventId);

      if (evaluationResponses && evaluationResponses.length > 0) {
        return { isCompleted: true };
      }

      return { isCompleted: false };
    } catch (error) {
      return { isCompleted: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Unregister user from an event
   * Supports offline queueing
   */
  static async unregisterFromEvent(eventId: string, userId: string): Promise<{ error?: string; queued?: boolean }> {
    try {
      // Check local database first (works offline)
      const localRegistrations = await LocalDatabaseService.getEventRegistrations(eventId, userId);
      const localRegistration = localRegistrations.find(r => r.status === 'registered');

      // If offline, queue cancellation and update locally
      if (!NetworkStatusMonitor.isOnline()) {
        if (!localRegistration) {
          return { error: 'You are not registered for this event' };
        }

        const cancelledRegistration = {
          ...localRegistration,
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        };

        // Save to local database
        await LocalDatabaseService.saveEventRegistration(cancelledRegistration);

        // Queue for sync (server wins for registrations)
        await SyncQueueService.enqueue(
          DataType.EVENT_REGISTRATION,
          'update',
          'event_registrations',
          cancelledRegistration,
          SyncPriority.HIGH
        );

        return { queued: true };
      }

      // Online: Check if registration exists
      const { data: registration, error: checkError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'registered')
        .maybeSingle();

      if (checkError) {
        return { error: checkError.message };
      }

      if (!registration) {
        return { error: 'You are not registered for this event' };
      }

      // Update status to cancelled
      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'cancelled' })
        .eq('id', registration.id);

      if (error) {
        return { error: error.message };
      }

      // Save to local database with cancelled status
      await LocalDatabaseService.saveEventRegistration({
        id: registration.id,
        event_id: registration.event_id,
        user_id: registration.user_id,
        status: 'cancelled',
        registration_date: registration.registration_date || registration.created_at?.split('T')[0],
        created_at: registration.created_at,
        updated_at: new Date().toISOString(),
      });

      return { queued: false };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}
