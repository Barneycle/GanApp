import { supabase } from './supabase';

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
  content_fields: Record<string, any>;
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

      if (!data) {
        return { error: 'No eligibility data returned' };
      }

      return { eligibility: data as CertificateEligibility };
    } catch (error: any) {
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
    } catch (error: any) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get certificate template for an event
   */
  static async getCertificateTemplate(
    eventId: string
  ): Promise<{ template?: CertificateTemplate; error?: string }> {
    try {
      const { data: activeTemplate, error: activeError } = await supabase
        .from('certificate-templates')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .maybeSingle();

      if (activeTemplate) {
        return { template: activeTemplate as CertificateTemplate };
      }

      const { data: anyTemplate, error: anyError } = await supabase
        .from('certificate-templates')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (anyTemplate) {
        return { error: `Certificate template exists but is inactive. Template ID: ${anyTemplate.id}` };
      }

      if (activeError || anyError) {
        console.error('Error fetching template:', activeError || anyError);
        return { error: (activeError || anyError)?.message || 'Failed to fetch certificate template' };
      }

      return { error: 'No certificate template found for this event' };
    } catch (error: any) {
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
        return {}; // No certificate found, but not an error
      }

      return { certificate: data as Certificate };
    } catch (error: any) {
      return { error: 'An unexpected error occurred' };
    }
  }
}

