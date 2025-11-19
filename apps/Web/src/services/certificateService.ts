import { supabase } from '../lib/supabaseClient';

export interface Certificate {
  id: string;
  certificate_template_id: string;
  event_id: string;
  user_id: string;
  certificate_number: string;
  participant_name: string;
  event_title: string;
  completion_date: string;
  certificate_pdf_url?: string;
  certificate_png_url?: string;
  preferred_format: 'pdf' | 'png';
  is_validated: boolean;
  generated_at: string;
}

export interface CertificateTemplate {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  template_url: string;
  template_type: 'pdf' | 'image' | 'document';
  content_fields: Record<string, string>;
  requires_attendance: boolean;
  requires_survey_completion: boolean;
  minimum_survey_score?: number;
  is_active: boolean;
}

export interface CertificateEligibility {
  eligible: boolean;
  attendance_verified: boolean;
  survey_completed: boolean;
  template_available: boolean;
  template?: CertificateTemplate;
}

export class CertificateService {
  /**
   * Check if user is eligible for certificate generation
   */
  static async checkEligibility(
    userId: string,
    eventId: string
  ): Promise<{ eligibility?: CertificateEligibility; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('check_certificate_eligibility', {
        user_uuid: userId,
        event_uuid: eventId,
      });

      if (error) {
        console.error('check_certificate_eligibility error:', error);
        return { error: error.message || 'Failed to check certificate eligibility' };
      }

      // Handle case where data might be null or undefined
      if (!data) {
        return { error: 'No eligibility data returned' };
      }

      return { eligibility: data as CertificateEligibility };
    } catch (error) {
      console.error('checkEligibility exception:', error);
      return { error: 'An unexpected error occurred while checking eligibility' };
    }
  }

  /**
   * Generate a certificate for a user and event
   */
  static async generateCertificate(
    userId: string,
    eventId: string,
    preferredFormat: 'pdf' | 'png' = 'pdf'
  ): Promise<{ certificate?: Certificate; error?: string }> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const generatedBy = sessionData?.session?.user?.id;

      if (!generatedBy) {
        return { error: 'User not authenticated' };
      }

      const { data, error } = await supabase.rpc('generate_certificate', {
        user_uuid: userId,
        event_uuid: eventId,
        generated_by_uuid: generatedBy,
        preferred_format_text: preferredFormat,
      });

      if (error) {
        return { error: error.message };
      }

      if (!data.success) {
        return { error: data.error || 'Failed to generate certificate' };
      }

      // Fetch the generated certificate from the database
      const { data: certificateData, error: fetchError } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', data.certificate_id)
        .single();

      if (fetchError || !certificateData) {
        return { error: fetchError?.message || 'Failed to fetch generated certificate' };
      }

      return { certificate: certificateData as Certificate };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Create or update certificate template record for an event
   */
  static async createOrUpdateTemplate(
    eventId: string,
    templateUrl: string,
    createdBy: string,
    title?: string,
    description?: string,
    namePlacement?: {
      x?: number;
      y?: number;
      fontSize?: number;
      color?: string;
      fontFamily?: string;
      fontWeight?: string;
      textAlign?: string;
    }
  ): Promise<{ template?: CertificateTemplate; error?: string }> {
    try {
      // Check if template already exists
      const { data: existingTemplate } = await supabase
        .from('certificate-templates')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      const contentFields: any = {
        participant_name: '{{name}}',
        event_title: '{{event}}',
        date: '{{date}}',
        organizer: '{{organizer}}',
      };

      // Add name_position if provided
      if (namePlacement) {
        contentFields.name_position = {
          x: namePlacement.x ?? 0.5,
          y: namePlacement.y ?? 0.5,
          fontSize: namePlacement.fontSize ?? 36,
          color: namePlacement.color ?? '#000000',
          fontFamily: namePlacement.fontFamily ?? 'Arial, sans-serif',
          fontWeight: namePlacement.fontWeight ?? 'bold',
          textAlign: namePlacement.textAlign ?? 'center',
        };
      }

      const templateData = {
        event_id: eventId,
        title: title || `Certificate Template for Event`,
        description: description || '',
        template_url: templateUrl,
        template_type: templateUrl.endsWith('.pdf') ? 'pdf' : templateUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image' : 'document',
        content_fields: contentFields,
        requires_attendance: true,
        requires_survey_completion: true,
        minimum_survey_score: 0,
        is_active: true,
        created_by: createdBy,
      };

      if (existingTemplate) {
        // Update existing template
        const { data, error } = await supabase
          .from('certificate-templates')
          .update({
            ...templateData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingTemplate.id)
          .select()
          .single();

        if (error) {
          return { error: error.message };
        }

        return { template: data as CertificateTemplate };
      } else {
        // Create new template
        const { data, error } = await supabase
          .from('certificate-templates')
          .insert(templateData)
          .select()
          .single();

        if (error) {
          return { error: error.message };
        }

        return { template: data as CertificateTemplate };
      }
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Check if event has certificate template URL
   * Simplified - just checks the events table directly
   */
  static async checkTemplateFromEvent(
    eventId: string,
    eventTemplateUrl?: string
  ): Promise<{ hasTemplate: boolean; templateUrl?: string; error?: string }> {
    try {
      // If template URL is provided, use it directly
      if (eventTemplateUrl && eventTemplateUrl.trim()) {
        return { 
          hasTemplate: true, 
          templateUrl: eventTemplateUrl.split(',')[0].trim() 
        };
      }

      // Otherwise, fetch from events table
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('certificate_templates_url')
        .eq('id', eventId)
        .single();

      if (eventError) {
        return { hasTemplate: false, error: eventError.message };
      }

      if (eventData?.certificate_templates_url) {
        return { 
          hasTemplate: true, 
          templateUrl: eventData.certificate_templates_url.split(',')[0].trim() 
        };
      }

      return { hasTemplate: false };
    } catch (error) {
      console.error('Exception in checkTemplateFromEvent:', error);
      return { hasTemplate: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get certificate template for an event
   */
  static async getCertificateTemplate(
    eventId: string
  ): Promise<{ template?: CertificateTemplate; error?: string }> {
    try {
      // First try with is_active = true
      const { data: activeTemplate, error: activeError } = await supabase
        .from('certificate-templates')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .maybeSingle();

      if (activeTemplate) {
        return { template: activeTemplate as CertificateTemplate };
      }

      // If no active template, check if any template exists (even if inactive)
      const { data: anyTemplate, error: anyError } = await supabase
        .from('certificate-templates')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (anyTemplate) {
        // Template exists but is inactive
        return { error: `Certificate template exists but is inactive. Template ID: ${anyTemplate.id}` };
      }

      if (activeError || anyError) {
        console.error('Error fetching template:', activeError || anyError);
        return { error: (activeError || anyError)?.message || 'Failed to fetch certificate template' };
      }

      return { error: 'No certificate template found for this event' };
    } catch (error) {
      console.error('Exception in getCertificateTemplate:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get user's certificate for an event
   */
  static async getUserCertificate(
    userId: string,
    eventId: string
  ): Promise<{ certificate?: Certificate; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        return { error: 'Certificate not found' };
      }

      return { certificate: data as Certificate };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}

