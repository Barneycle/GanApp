import { supabase } from '../lib/supabaseClient';
import { logActivity } from '../utils/activityLogger';
import { CacheService } from './cacheService';

export interface Event {
  id: string;
  title: string;
  rationale: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  status: 'draft' | 'published' | 'cancelled';
  is_featured?: boolean;
  max_participants?: number;
  current_participants?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  banner_url?: string;
  materials_url?: string;
  event_programmes_url?: string;
  certificate_templates_url?: string;
  event_kits_url?: string;
}

export interface EventWithDetails extends Event {
  creator: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
  };
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  registration_date: string;
  status: 'registered' | 'cancelled' | 'attended';
  created_at: string;
}

export class EventService {
  static async getAllEvents(): Promise<{ events?: Event[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      // Calculate current participants for each event
      const eventsWithParticipants = await Promise.all(
        data.map(async (event) => {
          const { count } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'registered'); // Only count 'registered' status
          
          return {
            ...event,
            current_participants: count || 0
          };
        })
      );

      return { events: eventsWithParticipants };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getEventById(id: string): Promise<{ event?: Event; error?: string }> {
    try {
      // Check cache first
      const cacheKey = CacheService.keys.event(id);
      const cached = await CacheService.get<Event>(cacheKey);
      if (cached) {
        return { event: cached };
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        return { error: 'Event not found' };
      }

      // Cache the result
      await CacheService.set(cacheKey, data, CacheService.TTL.MEDIUM);

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async createEvent(eventData: Partial<Event>): Promise<{ event?: Event; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      // Log activity
      if (data && eventData.created_by) {
        logActivity(
          eventData.created_by,
          'create',
          'event',
          {
            resourceId: data.id,
            resourceName: data.title || 'Untitled Event',
            details: { event_id: data.id, title: data.title }
          }
        ).catch(err => console.error('Failed to log event creation:', err));
      }

      // Invalidate cache
      await CacheService.deletePattern('events:*');

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateEvent(id: string, updates: Partial<Event>): Promise<{ event?: Event; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      // Invalidate cache
      await CacheService.delete(CacheService.keys.event(id));
      await CacheService.deletePattern('events:*');

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async deleteEvent(id: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        return { error: error.message };
      }

      // Invalidate cache
      await CacheService.delete(CacheService.keys.event(id));
      await CacheService.deletePattern('events:*');

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getEventsByCreator(creatorId: string): Promise<{ events?: Event[]; error?: string }> {
    try {
      // Check cache first
      const cacheKey = CacheService.keys.eventList('organizer', creatorId);
      const cached = await CacheService.get<Event[]>(cacheKey);
      if (cached) {
        return { events: cached };
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', creatorId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      // Cache the result
      await CacheService.set(cacheKey, data, CacheService.TTL.SHORT);

      return { events: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getPublishedEvents(): Promise<{ events?: Event[]; error?: string }> {
    try {
      // Check cache first
      const cacheKey = CacheService.keys.events('published');
      const cached = await CacheService.get<Event[]>(cacheKey);
      if (cached) {
        return { events: cached };
      }
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      if (error) {
        // If table doesn't exist, return empty array instead of error
        if (error.code === 'PGRST205') {
          return { events: [] };
        }
        
        return { error: error.message };
      }


      // Always calculate count from actual registrations to avoid stale data
      const eventsWithParticipants = await Promise.all(
        data.map(async (event) => {
          
          // First, let's see what registrations exist for this event
          const { data: allRegistrations, error: allError } = await supabase
            .from('event_registrations')
            .select('*')
            .eq('event_id', event.id);
          
          if (allError) {
          } else {
            // Show the status of each registration
            allRegistrations.forEach((reg, index) => {
            });
          }
          
          // Now count only registered ones
          const { count, error } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'registered'); // Only count 'registered' status
          
          if (error) {
          }
          
          
          return {
            ...event,
            current_participants: count || 0
          };
        })
      );

      // Cache the result
      await CacheService.set(cacheKey, eventsWithParticipants, CacheService.TTL.SHORT);

      return { events: eventsWithParticipants };
    } catch (error) {
      // If it's a table not found error, return empty array
      if (error.message && error.message.includes('table') && error.message.includes('not found')) {
        return { events: [] };
      }
      
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateEventStatus(id: string, status: string): Promise<{ event?: Event; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
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

  static async setFeaturedEvent(id: string): Promise<{ event?: Event; error?: string }> {
    try {
      // First, unfeature all other events
      await supabase
        .from('events')
        .update({ is_featured: false })
        .neq('id', id);

      // Then set the selected event as featured
      const { data, error } = await supabase
        .from('events')
        .update({ is_featured: true })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async unfeatureEvent(id: string): Promise<{ event?: Event; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ is_featured: false })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  // Event Registration Methods
  static async registerForEvent(eventId: string, userId: string): Promise<{ registration?: EventRegistration; error?: string }> {
    try {
      
      // Check if user is already registered (active registration)
      const existingRegistration = await this.getUserRegistration(eventId, userId);
      if (existingRegistration.registration) {
        return { error: 'You are already registered for this event' };
      }

      // Check if THIS USER has a cancelled registration that we can reactivate
      const { data: cancelledRegistration, error: cancelledError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)  // Only check for THIS specific user
        .eq('status', 'cancelled')
        .maybeSingle();

      if (cancelledError) {
      }
      
      if (cancelledRegistration) {
      } else {
      }

      // Check if event exists and is published
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

      // Check if event has reached max participants
      if (eventResult.event.max_participants && eventResult.event.current_participants >= eventResult.event.max_participants) {
        return { error: 'This event has reached maximum capacity' };
      }

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
        return { error: registrationError.message };
      }

      // Log activity
      logActivity(
        userId,
        'create',
        'registration',
        {
          resourceId: registrationData.id,
          resourceName: eventResult.event.title || 'Event Registration',
          details: { registration_id: registrationData.id, event_id: eventId, event_title: eventResult.event.title }
        }
      ).catch(err => console.error('Failed to log event registration:', err));

      // Update event participant count - use database count + 1
      const currentCount = eventResult.event.current_participants || 0;
      const newCount = currentCount + 1;
      
      
      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          current_participants: newCount
        })
        .eq('id', eventId);

      if (updateError) {
        // Don't fail the registration if count update fails
      } else {
        
        // Verify the update worked
        const { data: updatedEvent, error: verifyError } = await supabase
          .from('events')
          .select('current_participants')
          .eq('id', eventId)
          .single();
          
        if (verifyError) {
        } else {
          
          // If verification shows the update didn't work, try again
          if (updatedEvent.current_participants !== newCount) {
            const { error: retryError } = await supabase
              .from('events')
              .update({ 
                current_participants: newCount
              })
              .eq('id', eventId);
              
            if (retryError) {
            } else {
            }
          }
        }
      }

      return { registration: registrationData };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async unregisterFromEvent(eventId: string, userId: string): Promise<{ error?: string }> {
    try {
      
      // Get current registration
      const registrationResult = await this.getUserRegistration(eventId, userId);
      if (registrationResult.error) {
        return { error: registrationResult.error };
      }

      if (!registrationResult.registration) {
        return { error: 'You are not registered for this event' };
      }


      // Get current event data to get the participant count
      const eventData = await this.getEventById(eventId);
      if (eventData.error) {
        return { error: eventData.error };
      }

      // Update event participant count - use database count - 1
      const currentCount = eventData.event.current_participants || 0;
      const newCount = Math.max(currentCount - 1, 0);
      
      const { data: updateData, error: updateError } = await supabase
        .from('events')
        .update({ 
          current_participants: newCount
        })
        .eq('id', eventId)
        .select('current_participants');

      if (updateError) {
        // Don't fail the cancellation if count update fails
      } else {
      }

      // Update registration status AFTER updating the count
      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'cancelled' })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        return { error: error.message };
      }


      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getUserRegistration(eventId: string, userId: string): Promise<{ registration?: EventRegistration; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'registered')  // Only get active registrations
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        // No active registration found
        return {};
      }

      return { registration: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getUserRegistrations(userId: string): Promise<{ registrations?: EventRegistration[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          *,
          events (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'registered')
        .order('registration_date', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { registrations: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getEventParticipants(eventId: string): Promise<{ participants?: any[]; error?: string }> {
    try {
      // Use RPC function to get participants with user data from auth.users
      const { data, error } = await supabase.rpc('get_event_participants', {
        event_uuid: eventId
      });

      if (error) {
        // Fallback: Get registrations and fetch user data separately
        const { data: registrations, error: regError } = await supabase
          .from('event_registrations')
          .select('*')
          .eq('event_id', eventId)
          .eq('status', 'registered')
          .order('registration_date', { ascending: false });

        if (regError) {
          return { error: regError.message };
        }

        // Fetch user data for each registration using get_user_profile
        const participantsWithUsers = await Promise.all(
          (registrations || []).map(async (reg) => {
            const { data: userData } = await supabase.rpc('get_user_profile', {
              user_id: reg.user_id
            });
            return {
              ...reg,
              users: userData || null
            };
          })
        );

        return { participants: participantsWithUsers };
      }

      return { participants: data || [] };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Request cancellation of an event (organizers only)
   */
  static async requestEventCancellation(
    eventId: string,
    userId: string,
    requestReason: string,
    cancellationDate: string,
    additionalNotes?: string
  ): Promise<{ request?: any; error?: string }> {
    try {
      // Verify user is the event creator (organizer)
      const eventResult = await this.getEventById(eventId);
      if (eventResult.error || !eventResult.event) {
        return { error: 'Event not found' };
      }

      if (eventResult.event.created_by !== userId) {
        return { error: 'Only the event organizer can request cancellation' };
      }

      // Check if event is already cancelled
      if (eventResult.event.status === 'cancelled') {
        return { error: 'Event is already cancelled' };
      }

      // Check if there's already a pending request
      const { data: existingRequests, error: checkError } = await supabase
        .from('event_cancellation_requests')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('requested_by', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        return { error: checkError.message };
      }

      if (existingRequests) {
        return { error: 'You already have a pending cancellation request for this event' };
      }

      // Create cancellation request
      const { data, error } = await supabase
        .from('event_cancellation_requests')
        .insert({
          event_id: eventId,
          requested_by: userId,
          request_reason: requestReason,
          cancellation_date: cancellationDate,
          additional_notes: additionalNotes || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { request: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get all archived events (for organizers and participants)
   */
  static async getArchivedEvents(): Promise<{ events?: Event[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('archived_events')
        .select('*')
        .order('archived_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      // Transform archived events to match Event interface
      const events = (data || []).map((archived) => ({
        id: archived.original_event_id || archived.id,
        title: archived.title,
        rationale: archived.rationale || archived.description || '',
        start_date: archived.start_date,
        end_date: archived.end_date,
        start_time: archived.start_time,
        end_time: archived.end_time,
        venue: archived.venue,
        status: archived.status === 'cancelled' ? 'cancelled' : 'completed',
        is_featured: archived.is_featured || false,
        max_participants: archived.max_participants,
        current_participants: archived.final_participant_count || 0,
        created_by: archived.created_by,
        created_at: archived.original_created_at,
        updated_at: archived.original_updated_at,
        banner_url: archived.banner_url,
        materials_url: archived.materials_url,
        event_programmes_url: archived.programme_url,
        certificate_templates_url: null,
        event_kits_url: archived.event_kits_url,
        sponsors: archived.sponsors,
        guest_speakers: archived.guest_speakers,
        archived_at: archived.archived_at,
        archive_reason: archived.archive_reason,
      }));

      return { events };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}
