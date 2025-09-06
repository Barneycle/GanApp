import { supabase } from './supabase';

export class EventService {
  static async getPublishedEvents() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('start_date', { ascending: true });

      if (error) throw error;
      return { success: true, events: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getEventsByCreator(creatorId: string) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, events: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async createEvent(eventData: any) {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, event: data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async updateEventStatus(eventId: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, event: data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
