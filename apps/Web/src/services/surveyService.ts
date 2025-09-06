import { supabase } from '../lib/supabaseClient';

export interface Survey {
  id: string;
  title: string;
  description: string;
  event_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  questions: any[];
  is_active: boolean;
}

export class SurveyService {
  static async getAllSurveys(): Promise<{ surveys?: Survey[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { surveys: data };
    } catch (error) {
      console.error('Get all surveys error:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getSurveyById(id: string): Promise<{ survey?: Survey; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { error: error.message };
      }

      return { survey: data };
    } catch (error) {
      console.error('Get survey by id error:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  static async createSurvey(surveyData: Partial<Survey>): Promise<{ survey?: Survey; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .insert([surveyData])
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { survey: data };
    } catch (error) {
      console.error('Create survey error:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateSurvey(id: string, updates: Partial<Survey>): Promise<{ survey?: Survey; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { survey: data };
    } catch (error) {
      console.error('Update survey error:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  static async deleteSurvey(id: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      console.error('Delete survey error:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getSurveysByEvent(eventId: string): Promise<{ surveys?: Survey[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { surveys: data };
    } catch (error) {
      console.error('Get surveys by event error:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getSurveysByCreator(creatorId: string): Promise<{ surveys?: Survey[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('created_by', creatorId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { surveys: data };
    } catch (error) {
      console.error('Get surveys by creator error:', error);
      return { error: 'An unexpected error occurred' };
    }
  }
}
