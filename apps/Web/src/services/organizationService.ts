import { supabase } from '../lib/supabaseClient';

export interface Organization {
  id: string;
  name: string;
  category: string | null;
  campus: string | null;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationGroup {
  category: string;
  organizations: Organization[];
}

export class OrganizationService {
  /**
   * Get all organizations grouped by category
   */
  static async getAllOrganizations(): Promise<{ organizations?: Organization[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('category', { ascending: true, nullsFirst: false })
        .order('campus', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching organizations:', error);
        return { error: error.message };
      }

      return { organizations: data || [] };
    } catch (error: any) {
      console.error('Error in getAllOrganizations:', error);
      return { error: error.message || 'Failed to fetch organizations' };
    }
  }

  /**
   * Get organizations grouped by category for dropdown display
   */
  static async getOrganizationsGrouped(): Promise<{ groups?: OrganizationGroup[]; error?: string }> {
    try {
      const result = await this.getAllOrganizations();
      
      if (result.error) {
        return { error: result.error };
      }

      if (!result.organizations) {
        return { groups: [] };
      }

      // Group organizations by category
      const grouped: { [key: string]: Organization[] } = {};
      
      result.organizations.forEach(org => {
        // Use category if available, otherwise use campus, otherwise 'Other'
        const category = org.category || org.campus || 'Other';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(org);
      });

      // Define custom sort order to match user's structure
      const categoryOrder = [
        'CAH',
        'CBM',
        'CEC',
        'CED',
        'COS',
        'Sagñay Campus',
        'Salogon Campus',
        'San Jose Campus',
        'Lagonoy Campus',
        'Tinambac Campus',
        'Caramoan Campus',
        'Interest Groups',
        'Fraternities & Sororities',
        'Other'
      ];

      // Convert to array format with custom sorting
      const groups: OrganizationGroup[] = Object.keys(grouped)
        .sort((a, b) => {
          const indexA = categoryOrder.indexOf(a);
          const indexB = categoryOrder.indexOf(b);
          
          // If both are in the custom order, sort by their position
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          // If only A is in the order, it comes first
          if (indexA !== -1) return -1;
          // If only B is in the order, it comes first
          if (indexB !== -1) return 1;
          // If neither is in the order, sort alphabetically
          return a.localeCompare(b);
        })
        .map(category => ({
          category,
          organizations: grouped[category]
        }));

      return { groups };
    } catch (error: any) {
      console.error('Error in getOrganizationsGrouped:', error);
      return { error: error.message || 'Failed to group organizations' };
    }
  }

  /**
   * Create a custom organization (when user selects "Other")
   */
  static async createCustomOrganization(
    name: string,
    userId: string
  ): Promise<{ organization?: Organization; error?: string }> {
    try {
      // Check if organization already exists
      const { data: existing } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', name)
        .single();

      if (existing) {
        // Return existing organization
        return { organization: existing };
      }

      // Create new custom organization
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: name.trim(),
          is_custom: true,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating custom organization:', error);
        return { error: error.message };
      }

      return { organization: data };
    } catch (error: any) {
      console.error('Error in createCustomOrganization:', error);
      return { error: error.message || 'Failed to create organization' };
    }
  }

  /**
   * Get organization by name
   */
  static async getOrganizationByName(name: string): Promise<{ organization?: Organization; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', name)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return { organization: undefined };
        }
        return { error: error.message };
      }

      return { organization: data };
    } catch (error: any) {
      console.error('Error in getOrganizationByName:', error);
      return { error: error.message || 'Failed to fetch organization' };
    }
  }
}

