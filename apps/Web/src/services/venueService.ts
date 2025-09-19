import { supabase } from '../lib/supabaseClient';

export interface Venue {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export class VenueService {
  static async getAllVenues(): Promise<{ venues?: Venue[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        return { error: error.message };
      }

      return { venues: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getVenueById(id: string): Promise<{ venue?: Venue; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        return { error: 'Venue not found' };
      }

      return { venue: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getVenueByName(name: string): Promise<{ venue?: Venue; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('name', name)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      return { venue: data || null };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async createVenue(venueData: { name: string; created_by: string }): Promise<{ venue?: Venue; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .insert([{
          name: venueData.name,
          is_active: true,
          created_by: venueData.created_by
        }])
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { venue: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateVenue(id: string, updates: Partial<Venue>): Promise<{ venue?: Venue; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { venue: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async deactivateVenue(id: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('venues')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}
