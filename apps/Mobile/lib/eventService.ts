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
  sponsors?: Array<{ name: string; website?: string }>;
  guest_speakers?: Array<{ name: string; title?: string }>;
  banner_url?: string;
  speaker_photos_url?: string;
  sponsor_logos_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
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
}
