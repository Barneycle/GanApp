import { supabase } from '../lib/supabaseClient';

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

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getEventsByCreator(creatorId: string): Promise<{ events?: Event[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', creatorId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { events: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getPublishedEvents(): Promise<{ events?: Event[]; error?: string }> {
    try {
      
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
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          *,
          users (
            id,
            email,
            first_name,
            last_name,
            user_type,
            organization
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'registered')
        .order('registration_date', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { participants: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}
