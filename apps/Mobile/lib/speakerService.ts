import { supabase } from './supabase';

export interface GuestSpeaker {
  id: string;
  prefix?: string; // Dr., Prof., Mr., Ms., etc.
  first_name: string;
  last_name: string;
  middle_initial?: string;
  affix?: string; // Jr., Sr., III, etc.
  designation?: string; // Job title/position
  organization?: string;
  bio?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface EventSpeaker {
  id: string;
  event_id: string;
  speaker_id: string;
  speaker_order: number;
  is_keynote: boolean;
  created_at: string;
  speaker: GuestSpeaker;
}

export class SpeakerService {
  // Guest Speaker CRUD operations
  static async getAllSpeakers(): Promise<{ speakers?: GuestSpeaker[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('guest_speakers')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) {
        return { error: error.message };
      }

      return { speakers: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getSpeakerById(id: string): Promise<{ speaker?: GuestSpeaker; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('guest_speakers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        return { error: 'Speaker not found' };
      }

      return { speaker: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async createSpeaker(speakerData: Omit<GuestSpeaker, 'id' | 'created_at' | 'updated_at'>): Promise<{ speaker?: GuestSpeaker; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('guest_speakers')
        .insert([speakerData])
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { speaker: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateSpeaker(id: string, updates: Partial<GuestSpeaker>): Promise<{ speaker?: GuestSpeaker; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('guest_speakers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { speaker: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async deleteSpeaker(id: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('guest_speakers')
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

  // Event-Speaker relationship operations
  static async getEventSpeakers(eventId: string): Promise<{ speakers?: EventSpeaker[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_speakers')
        .select(`
          *,
          speaker:guest_speakers (*)
        `)
        .eq('event_id', eventId)
        .order('speaker_order', { ascending: true });

      if (error) {
        return { error: error.message };
      }

      return { speakers: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async addSpeakerToEvent(eventId: string, speakerId: string, options?: { order?: number; isKeynote?: boolean }): Promise<{ eventSpeaker?: EventSpeaker; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_speakers')
        .insert([{
          event_id: eventId,
          speaker_id: speakerId,
          speaker_order: options?.order || 0,
          is_keynote: options?.isKeynote || false
        }])
        .select(`
          *,
          speaker:guest_speakers (*)
        `)
        .single();

      if (error) {
        return { error: error.message };
      }

      return { eventSpeaker: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async removeSpeakerFromEvent(eventId: string, speakerId: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('event_speakers')
        .delete()
        .eq('event_id', eventId)
        .eq('speaker_id', speakerId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateEventSpeaker(eventId: string, speakerId: string, updates: { order?: number; isKeynote?: boolean }): Promise<{ eventSpeaker?: EventSpeaker; error?: string }> {
    try {
      const updateData: any = {};
      if (updates.order !== undefined) updateData.speaker_order = updates.order;
      if (updates.isKeynote !== undefined) updateData.is_keynote = updates.isKeynote;

      const { data, error } = await supabase
        .from('event_speakers')
        .update(updateData)
        .eq('event_id', eventId)
        .eq('speaker_id', speakerId)
        .select(`
          *,
          speaker:guest_speakers (*)
        `)
        .single();

      if (error) {
        return { error: error.message };
      }

      return { eventSpeaker: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  // Utility methods
  static async getSpeakerEvents(speakerId: string): Promise<{ events?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_speakers')
        .select(`
          *,
          event:events (
            id,
            title,
            start_date,
            end_date,
            venue,
            status
          )
        `)
        .eq('speaker_id', speakerId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { events: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}