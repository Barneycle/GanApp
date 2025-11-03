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
}