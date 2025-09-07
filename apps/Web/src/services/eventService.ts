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
  created_by: string;
  created_at: string;
  updated_at: string;
  sponsors?: any[];
  guest_speakers?: any[];
  banner_url?: string;
  materials_url?: string;
  sponsor_logos_url?: string;
  speaker_photos_url?: string;
  event_programmes_url?: string;
  certificate_templates_url?: string;
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

      return { events: data };
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

      return { events: data };
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
      // Check if user is already registered
      const existingRegistration = await this.getUserRegistration(eventId, userId);
      if (existingRegistration.registration) {
        return { error: 'You are already registered for this event' };
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

      // Create registration
      const { data, error } = await supabase
        .from('event_registrations')
        .insert([{
          event_id: eventId,
          user_id: userId,
          status: 'registered'
        }])
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      // Update event participant count
      await supabase
        .from('events')
        .update({ 
          current_participants: (eventResult.event.current_participants || 0) + 1 
        })
        .eq('id', eventId);

      return { registration: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async cancelEventRegistration(eventId: string, userId: string): Promise<{ error?: string }> {
    try {
      // Get current registration
      const registrationResult = await this.getUserRegistration(eventId, userId);
      if (registrationResult.error) {
        return { error: registrationResult.error };
      }

      if (!registrationResult.registration) {
        return { error: 'You are not registered for this event' };
      }

      // Update registration status
      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'cancelled' })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        return { error: error.message };
      }

      // Update event participant count
      const eventResult = await this.getEventById(eventId);
      if (eventResult.event) {
        await supabase
          .from('events')
          .update({ 
            current_participants: Math.max((eventResult.event.current_participants || 0) - 1, 0)
          })
          .eq('id', eventId);
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
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        // No registration found
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
          events (
            id,
            title,
            start_date,
            end_date,
            venue,
            status
          )
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
