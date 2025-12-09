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
  // Sponsor CRUD operations
  static async getAllSponsors(): Promise<{ sponsors?: Sponsor[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        return { error: error.message };
      }

      return { sponsors: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getSponsorById(id: string): Promise<{ sponsor?: Sponsor; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        return { error: 'Sponsor not found' };
      }

      return { sponsor: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async createSponsor(sponsorData: Omit<Sponsor, 'id' | 'created_at' | 'updated_at'>): Promise<{ sponsor?: Sponsor; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .insert([sponsorData])
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { sponsor: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateSponsor(id: string, updates: Partial<Sponsor>): Promise<{ sponsor?: Sponsor; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { sponsor: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async deleteSponsor(id: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('sponsors')
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

  static async addSponsorToEvent(eventId: string, sponsorId: string, options?: { order?: number }): Promise<{ eventSponsor?: EventSponsor; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_sponsors')
        .insert([{
          event_id: eventId,
          sponsor_id: sponsorId,
          sponsor_order: options?.order || 0
        }])
        .select(`
          *,
          sponsor:sponsors (*)
        `)
        .single();

      if (error) {
        return { error: error.message };
      }

      return { eventSponsor: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async removeSponsorFromEvent(eventId: string, sponsorId: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('event_sponsors')
        .delete()
        .eq('event_id', eventId)
        .eq('sponsor_id', sponsorId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateEventSponsor(eventId: string, sponsorId: string, updates: { order?: number }): Promise<{ eventSponsor?: EventSponsor; error?: string }> {
    try {
      const updateData: any = {};
      if (updates.order !== undefined) updateData.sponsor_order = updates.order;

      const { data, error } = await supabase
        .from('event_sponsors')
        .update(updateData)
        .eq('event_id', eventId)
        .eq('sponsor_id', sponsorId)
        .select(`
          *,
          sponsor:sponsors (*)
        `)
        .single();

      if (error) {
        return { error: error.message };
      }

      return { eventSponsor: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  // Utility methods
  static async getSponsorEvents(sponsorId: string): Promise<{ events?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_sponsors')
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
        .eq('sponsor_id', sponsorId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { events: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getSponsorsByRole(role: string): Promise<{ sponsors?: Sponsor[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('role', role)
        .order('name', { ascending: true });

      if (error) {
        return { error: error.message };
      }

      return { sponsors: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}