import { supabase } from './supabase';

export interface Sponsor {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  role?: string; // Main Sponsor, Gold Sponsor, Silver Sponsor, etc.
  contribution?: string; // Description of what they're contributing
  created_at: string;
  updated_at: string;
}

export interface EventSponsor {
  id: string;
  event_id: string;
  sponsor_id: string;
  sponsor_order: number;
  created_at: string;
  sponsor: Sponsor;
}

export class SponsorService {
  // Event-Sponsor relationship operations
  static async getEventSponsors(eventId: string): Promise<{ sponsors?: EventSponsor[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_sponsors')
        .select(`
          *,
          sponsor:sponsors (*)
        `)
        .eq('event_id', eventId)
        .order('sponsor_order', { ascending: true });

      if (error) {
        return { error: error.message };
      }

      return { sponsors: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}