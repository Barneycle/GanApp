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
  static async getEventSponsors(eventId: string): Promise<{ sponsors: EventSponsor[]; error?: string }> {
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
        console.error('Error fetching event sponsors:', error);
        return { sponsors: [], error: error.message };
      }

      return { sponsors: data || [], error: undefined };
    } catch (error) {
      console.error('Unexpected error in getEventSponsors:', error);
      return { sponsors: [], error: 'An unexpected error occurred' };
    }
  }

  static async getSponsorById(id: string): Promise<{ sponsor: Sponsor | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching sponsor by ID:', error);
        return { sponsor: null, error: error.message };
      }

      return { sponsor: data, error: undefined };
    } catch (error) {
      console.error('Unexpected error in getSponsorById:', error);
      return { sponsor: null, error: 'An unexpected error occurred' };
    }
  }

  static getSponsorsByRole(sponsors: EventSponsor[], role: string): EventSponsor[] {
    return sponsors.filter(eventSponsor => 
      eventSponsor.sponsor.role?.toLowerCase().includes(role.toLowerCase())
    );
  }

  static groupSponsorsByRole(sponsors: EventSponsor[]): Record<string, EventSponsor[]> {
    const grouped: Record<string, EventSponsor[]> = {};
    
    sponsors.forEach(eventSponsor => {
      const role = eventSponsor.sponsor.role || 'Other';
      if (!grouped[role]) {
        grouped[role] = [];
      }
      grouped[role].push(eventSponsor);
    });

    return grouped;
  }
}
