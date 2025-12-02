import { supabase } from './supabase';

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
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: 'registered' | 'cancelled' | 'attended';
  created_at: string;
}

export class EventService {
  static async getPublishedEvents(): Promise<{ events: Event[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching published events:', error);
        return { events: [], error: error.message };
      }

      return { events: data || [], error: undefined };
    } catch (error) {
      console.error('Unexpected error in getPublishedEvents:', error);
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

  static async getEventById(eventId: string): Promise<{ event: Event | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching event by ID:', error);
        return { event: null, error: error.message };
      }

      return { event: data, error: undefined };
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

  static async updateEvent(eventId: string, updates: Partial<Event>): Promise<{ event: Event | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        console.error('Error updating event:', error);
        return { event: null, error: error.message };
      }

      return { event: data, error: undefined };
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

  static async getUserRegistrations(userId: string): Promise<{ registrations?: Array<{ events: Event; registration_date: string; registration_id: string }>; error?: string }> {
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
        return { registrations: [], error: error.message };
      }

      if (!data || data.length === 0) {
        return { registrations: [], error: undefined };
      }

      // Filter out any registrations where the event is null (deleted events)
      const validRegistrations = data.filter(registration => registration.events !== null);

      if (validRegistrations.length === 0) {
        return { registrations: [], error: undefined };
      }

      const registrations = validRegistrations.map(registration => ({
        events: registration.events as Event,
        registration_date: registration.registration_date || registration.created_at,
        registration_id: registration.id
      }));

      return { registrations, error: undefined };
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

  static async getUserRegistration(eventId: string, userId: string): Promise<{ registration?: EventRegistration; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'registered')
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        return {};
      }

      return { registration: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

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
        .eq('user_id', userId)
        .eq('status', 'cancelled')
        .maybeSingle();

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
      if (eventResult.event.max_participants && eventResult.event.current_participants && eventResult.event.current_participants >= eventResult.event.max_participants) {
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
        console.error('Registration error:', registrationError);
        return { error: registrationError.message };
      }

      if (!registrationData) {
        console.error('Registration data is null after insert/update');
        return { error: 'Failed to create registration' };
      }

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

      return { registration: registrationData };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}
