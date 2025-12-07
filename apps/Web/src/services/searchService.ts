import { supabase } from '../lib/supabaseClient';
import { EventService } from './eventService';
import { SurveyService } from './surveyService';
import { UserService } from './userService';

export interface SearchResult {
  type: 'event' | 'survey' | 'user';
  id: string;
  title: string;
  description?: string;
  metadata?: any;
  relevance?: number;
}

export interface SearchFilters {
  types?: ('event' | 'survey' | 'user')[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  status?: string;
  role?: string;
}

export class SearchService {
  /**
   * Perform global search across events, surveys, and users
   */
  static async globalSearch(
    query: string,
    filters?: SearchFilters,
    limit: number = 50
  ): Promise<{ results?: SearchResult[]; error?: string }> {
    try {
      if (!query || query.trim().length === 0) {
        return { results: [] };
      }

      const searchTerm = query.trim().toLowerCase();
      const results: SearchResult[] = [];
      const typesToSearch = filters?.types || ['event', 'survey', 'user'];

      // Search events
      if (typesToSearch.includes('event')) {
        const eventResults = await this.searchEvents(searchTerm, filters, limit);
        results.push(...eventResults);
      }

      // Search surveys
      if (typesToSearch.includes('survey')) {
        const surveyResults = await this.searchSurveys(searchTerm, filters, limit);
        results.push(...surveyResults);
      }

      // Search users (admin/organizer only)
      if (typesToSearch.includes('user')) {
        const userResults = await this.searchUsers(searchTerm, filters, limit);
        results.push(...userResults);
      }

      // Sort by relevance if available
      results.sort((a, b) => {
        if (a.relevance && b.relevance) {
          return b.relevance - a.relevance;
        }
        return 0;
      });

      return { results: results.slice(0, limit) };
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' };
    }
  }

  /**
   * Search events
   */
  private static async searchEvents(
    searchTerm: string,
    filters?: SearchFilters,
    limit: number = 20
  ): Promise<SearchResult[]> {
    try {
      let query = supabase
        .from('events')
        .select('id, title, description, rationale, start_date, end_date, status, venue')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,rationale.ilike.%${searchTerm}%,venue.ilike.%${searchTerm}%`)
        .limit(limit);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.dateRange?.start) {
        query = query.gte('start_date', filters.dateRange.start);
      }

      if (filters?.dateRange?.end) {
        query = query.lte('end_date', filters.dateRange.end);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error searching events:', error);
        return [];
      }

      return (data || []).map(event => {
        const titleMatch = event.title?.toLowerCase().includes(searchTerm);
        const descriptionMatch = event.description?.toLowerCase().includes(searchTerm);
        const rationaleMatch = event.rationale?.toLowerCase().includes(searchTerm);
        
        let relevance = 0;
        if (titleMatch) relevance += 3;
        if (descriptionMatch) relevance += 2;
        if (rationaleMatch) relevance += 1;

        return {
          type: 'event' as const,
          id: event.id,
          title: event.title,
          description: event.description || event.rationale?.substring(0, 200),
          metadata: {
            start_date: event.start_date,
            end_date: event.end_date,
            status: event.status,
            venue: event.venue
          },
          relevance
        };
      });
    } catch (error) {
      console.error('Error in searchEvents:', error);
      return [];
    }
  }

  /**
   * Search surveys
   */
  private static async searchSurveys(
    searchTerm: string,
    filters?: SearchFilters,
    limit: number = 20
  ): Promise<SearchResult[]> {
    try {
      let query = supabase
        .from('surveys')
        .select('id, title, description, event_id, is_active')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(limit);

      if (filters?.status) {
        if (filters.status === 'active') {
          query = query.eq('is_active', true);
        } else if (filters.status === 'inactive') {
          query = query.eq('is_active', false);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error searching surveys:', error);
        return [];
      }

      return (data || []).map(survey => {
        const titleMatch = survey.title?.toLowerCase().includes(searchTerm);
        const descriptionMatch = survey.description?.toLowerCase().includes(searchTerm);
        
        let relevance = 0;
        if (titleMatch) relevance += 3;
        if (descriptionMatch) relevance += 2;

        return {
          type: 'survey' as const,
          id: survey.id,
          title: survey.title,
          description: survey.description,
          metadata: {
            event_id: survey.event_id,
            is_active: survey.is_active
          },
          relevance
        };
      });
    } catch (error) {
      console.error('Error in searchSurveys:', error);
      return [];
    }
  }

  /**
   * Search users (admin/organizer only)
   */
  private static async searchUsers(
    searchTerm: string,
    filters?: SearchFilters,
    limit: number = 20
  ): Promise<SearchResult[]> {
    try {
      let query = supabase
        .from('users')
        .select('id, email, first_name, last_name, role, organization')
        .or(`email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,organization.ilike.%${searchTerm}%`)
        .limit(limit);

      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error searching users:', error);
        return [];
      }

      return (data || []).map(user => {
        const emailMatch = user.email?.toLowerCase().includes(searchTerm);
        const nameMatch = `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm);
        const orgMatch = user.organization?.toLowerCase().includes(searchTerm);
        
        let relevance = 0;
        if (emailMatch) relevance += 3;
        if (nameMatch) relevance += 2;
        if (orgMatch) relevance += 1;

        return {
          type: 'user' as const,
          id: user.id,
          title: `${user.first_name} ${user.last_name}`.trim() || user.email,
          description: `${user.email}${user.organization ? ` • ${user.organization}` : ''}`,
          metadata: {
            email: user.email,
            role: user.role,
            organization: user.organization
          },
          relevance
        };
      });
    } catch (error) {
      console.error('Error in searchUsers:', error);
      return [];
    }
  }

  /**
   * Get search suggestions (autocomplete)
   */
  static async getSuggestions(
    query: string,
    limit: number = 10
  ): Promise<{ suggestions?: string[]; error?: string }> {
    try {
      if (!query || query.trim().length < 2) {
        return { suggestions: [] };
      }

      const searchTerm = query.trim().toLowerCase();
      const suggestions: Set<string> = new Set();

      // Get event title suggestions
      const { data: events } = await supabase
        .from('events')
        .select('title')
        .ilike('title', `%${searchTerm}%`)
        .limit(5);

      events?.forEach(event => {
        if (event.title) {
          suggestions.add(event.title);
        }
      });

      // Get survey title suggestions
      const { data: surveys } = await supabase
        .from('surveys')
        .select('title')
        .ilike('title', `%${searchTerm}%`)
        .limit(5);

      surveys?.forEach(survey => {
        if (survey.title) {
          suggestions.add(survey.title);
        }
      });

      return { suggestions: Array.from(suggestions).slice(0, limit) };
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' };
    }
  }
}

