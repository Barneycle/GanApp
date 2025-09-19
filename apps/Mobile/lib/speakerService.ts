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
  static async getEventSpeakers(eventId: string): Promise<{ speakers: EventSpeaker[]; error?: string }> {
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
        console.error('Error fetching event speakers:', error);
        return { speakers: [], error: error.message };
      }

      return { speakers: data || [], error: undefined };
    } catch (error) {
      console.error('Unexpected error in getEventSpeakers:', error);
      return { speakers: [], error: 'An unexpected error occurred' };
    }
  }

  static async getSpeakerById(id: string): Promise<{ speaker: GuestSpeaker | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('guest_speakers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching speaker by ID:', error);
        return { speaker: null, error: error.message };
      }

      return { speaker: data, error: undefined };
    } catch (error) {
      console.error('Unexpected error in getSpeakerById:', error);
      return { speaker: null, error: 'An unexpected error occurred' };
    }
  }

  static getFullName(speaker: GuestSpeaker): string {
    const parts = [];
    if (speaker.prefix) parts.push(speaker.prefix);
    parts.push(speaker.first_name);
    if (speaker.middle_initial) parts.push(speaker.middle_initial);
    parts.push(speaker.last_name);
    if (speaker.affix) parts.push(speaker.affix);
    return parts.join(' ');
  }

  static getDisplayTitle(speaker: GuestSpeaker): string {
    const parts = [];
    if (speaker.designation) parts.push(speaker.designation);
    if (speaker.organization) parts.push(speaker.organization);
    return parts.join(' at ');
  }
}
