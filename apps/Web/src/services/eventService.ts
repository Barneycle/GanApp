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
        .single();

      if (error) {
        return { error: error.message };
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
}
