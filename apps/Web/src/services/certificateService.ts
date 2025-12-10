import { supabase } from '../lib/supabaseClient';

export interface CertificateConfig {
  id?: string;
  event_id: string;
  background_color?: string;
  background_image_url?: string | null;
  border_color?: string;
  border_width?: number;
  title_text?: string;
  title_subtitle?: string;
  title_font_size?: number;
  title_color?: string;
  title_position?: {
    x: number; // percentage from left (0-100)
    y: number; // percentage from top (0-100)
  };
  name_config?: {
    font_size?: number;
    color?: string;
    position?: {
      x: number;
      y: number;
    };
    font_family?: string;
    font_weight?: 'normal' | 'bold';
  };
  event_title_config?: {
    font_size?: number;
    color?: string;
    position?: {
      x: number;
      y: number;
    };
    font_family?: string;
    font_weight?: 'normal' | 'bold';
  };
  date_config?: {
    font_size?: number;
    color?: string;
    position?: {
      x: number;
      y: number;
    };
    font_family?: string;
    font_weight?: 'normal' | 'bold';
    date_format?: string;
  };
  // New enhanced fields
  header_config?: {
    republic_text?: string;
    university_text?: string;
    location_text?: string;
    republic_config?: {
      font_size?: number;
      color?: string;
      position?: { x: number; y: number };
      font_family?: string;
      font_weight?: 'normal' | 'bold';
    };
    university_config?: {
      font_size?: number;
      color?: string;
      position?: { x: number; y: number };
      font_family?: string;
      font_weight?: 'normal' | 'bold';
    };
    location_config?: {
      font_size?: number;
      color?: string;
      position?: { x: number; y: number };
      font_family?: string;
      font_weight?: 'normal' | 'bold';
    };
  };
  logo_config?: {
    psu_logo_url?: string | null;
    psu_logo_size?: { width: number; height: number };
    psu_logo_position?: { x: number; y: number };
    logos?: Array<{
      url: string;
      size: { width: number; height: number };
      position: { x: number; y: number };
    }>;
    sponsor_logos?: string[];
    sponsor_logo_size?: { width: number; height: number };
    sponsor_logo_position?: { x: number; y: number };
    sponsor_logo_spacing?: number;
  };
  background_image_size?: { width: number; height: number } | null;
  participation_text_config?: {
    text_template?: string;
    font_size?: number;
    color?: string;
    position?: { x: number; y: number };
    font_family?: string;
    font_weight?: 'normal' | 'bold';
    line_height?: number;
  };
  given_text_config?: {
    text_template?: string;
    font_size?: number;
    color?: string;
    position?: { x: number; y: number };
    font_family?: string;
    font_weight?: 'normal' | 'bold';
  };
  is_given_to_config?: {
    text?: string;
    font_size?: number;
    color?: string;
    position?: { x: number; y: number };
    font_family?: string;
    font_weight?: 'normal' | 'bold';
  };
  signature_blocks?: Array<{
    signature_image_url?: string | null;
    signature_image_width?: number;
    signature_image_height?: number;
    name?: string;
    position?: string;
    position_config?: { x: number; y: number };
    name_font_size?: number;
    name_color?: string;
    position_font_size?: number;
    position_color?: string;
    font_family?: string;
  }>;
  // Certificate ID configuration
  cert_id_prefix?: string; // User-defined prefix for certificate ID (format: prefix-001)
  cert_id_position?: { x: number; y: number }; // Position for certificate ID display
  cert_id_font_size?: number;
  cert_id_color?: string;
  // QR Code configuration
  qr_code_enabled?: boolean; // Enable/disable QR code
  qr_code_size?: number; // Size in pixels
  qr_code_position?: { x: number; y: number }; // Position beside cert ID
  width?: number;
  height?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Certificate {
  id: string;
  event_id: string;
  user_id: string;
  certificate_number: string;
  participant_name: string;
  event_title: string;
  completion_date: string;
  certificate_pdf_url?: string;
  certificate_png_url?: string;
  generated_at: string;
}

export class CertificateService {
  /**
   * Get certificate config for an event
   */
  static async getCertificateConfig(eventId: string): Promise<{ config?: CertificateConfig; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('certificate_configs')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No config found
          return { config: undefined };
        }
        return { error: error.message };
      }

      return { config: data as CertificateConfig };
    } catch (err: any) {
      return { error: err.message || 'Failed to fetch certificate config' };
    }
  }

  /**
   * Save or update certificate config for an event
   */
  static async saveCertificateConfig(
    eventId: string,
    config: Omit<CertificateConfig, 'id' | 'event_id' | 'created_at' | 'updated_at'>,
    userId: string
  ): Promise<{ config?: CertificateConfig; error?: string }> {
    try {
      // Check if config exists
      const existing = await this.getCertificateConfig(eventId);

      if (existing.config) {
        // Update existing config
        // Ensure signature_blocks is properly serialized as JSONB
        const updateData = {
          ...config,
          signature_blocks: Array.isArray(config.signature_blocks) ? config.signature_blocks : [],
          logo_config: config.logo_config || {},
          background_image_url: config.background_image_url !== undefined ? config.background_image_url : null,
          background_image_size: config.background_image_size !== undefined ? config.background_image_size : null,
          cert_id_prefix: config.cert_id_prefix !== undefined ? config.cert_id_prefix : '',
          cert_id_position: config.cert_id_position || { x: 50, y: 95 },
          cert_id_font_size: config.cert_id_font_size !== undefined ? config.cert_id_font_size : 14,
          cert_id_color: config.cert_id_color || '#000000',
          qr_code_enabled: config.qr_code_enabled !== undefined ? config.qr_code_enabled : true,
          qr_code_position: config.qr_code_position || { x: 60, y: 95 },
          qr_code_size: config.qr_code_size !== undefined ? config.qr_code_size : 60,
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('certificate_configs')
          .update(updateData)
          .eq('event_id', eventId)
          .select()
          .single();

        if (error) {
          return { error: error.message };
        }

        return { config: data as CertificateConfig };
      } else {
        // Create new config
        // Ensure signature_blocks is properly serialized as JSONB
        // IMPORTANT: created_by must be set AFTER spreading config to ensure it's not overridden
        const { created_by: _, ...configWithoutCreatedBy } = config;
        const insertData = {
          event_id: eventId,
          ...configWithoutCreatedBy,
          created_by: userId, // Always set created_by to the authenticated user
          signature_blocks: Array.isArray(config.signature_blocks) ? config.signature_blocks : [],
          logo_config: config.logo_config || {},
          background_image_url: config.background_image_url !== undefined ? config.background_image_url : null,
          background_image_size: config.background_image_size !== undefined ? config.background_image_size : null,
          cert_id_prefix: config.cert_id_prefix !== undefined ? config.cert_id_prefix : '',
          cert_id_position: config.cert_id_position || { x: 50, y: 95 },
          cert_id_font_size: config.cert_id_font_size !== undefined ? config.cert_id_font_size : 14,
          cert_id_color: config.cert_id_color || '#000000',
          qr_code_enabled: config.qr_code_enabled !== undefined ? config.qr_code_enabled : true,
          qr_code_position: config.qr_code_position || { x: 60, y: 95 },
          qr_code_size: config.qr_code_size !== undefined ? config.qr_code_size : 60
        };
        
        const { data, error } = await supabase
          .from('certificate_configs')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('Certificate config insert error:', error);
          console.error('Insert data:', JSON.stringify(insertData, null, 2));
          console.error('Event ID:', eventId);
          console.error('User ID:', userId);
          return { error: error.message || 'Failed to create certificate config' };
        }

        return { config: data as CertificateConfig };
      }
    } catch (err: any) {
      console.error('Certificate config save error:', err);
      return { error: err.message || 'Failed to save certificate config' };
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
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No certificate found
          return { certificate: undefined };
        }
        return { error: error.message };
      }

      return { certificate: data as Certificate };
    } catch (err: any) {
      return { error: err.message || 'Failed to fetch certificate' };
    }
  }

  /**
   * Save generated certificate to database
   */
  static async saveCertificate(
    certificateData: {
      event_id: string;
      user_id: string;
      certificate_number: string;
      participant_name: string;
      event_title: string;
      completion_date: string;
      certificate_pdf_url?: string;
      certificate_png_url?: string;
    }
  ): Promise<{ certificate?: Certificate; error?: string }> {
    try {
      // Check if certificate already exists
      const existing = await this.getUserCertificate(certificateData.user_id, certificateData.event_id);

      if (existing.certificate) {
        // Update existing certificate
        const { data, error } = await supabase
          .from('certificates')
          .update({
            certificate_pdf_url: certificateData.certificate_pdf_url,
            certificate_png_url: certificateData.certificate_png_url
          })
          .eq('id', existing.certificate.id)
          .select()
          .single();

        if (error) {
          return { error: error.message };
        }

        return { certificate: data as Certificate };
      } else {
        // Create new certificate
        const { data, error } = await supabase
          .from('certificates')
          .insert({
            ...certificateData,
            generated_by: certificateData.user_id
          })
          .select()
          .single();

        if (error) {
          return { error: error.message };
        }

        return { certificate: data as Certificate };
      }
    } catch (err: any) {
      return { error: err.message || 'Failed to save certificate' };
    }
  }

  /**
   * Upload certificate file to storage
   */
  static async uploadCertificateFile(
    file: Blob,
    fileName: string,
    format: 'pdf' | 'png',
    eventId: string,
    userId: string
  ): Promise<{ url?: string; error?: string }> {
    try {
      const bucketName = 'generated-certificates';
      // Path format: certificates/{eventId}/{userId}/{fileName} to match RLS policy
      const filePath = `certificates/${eventId}/${userId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          contentType: format === 'pdf' ? 'application/pdf' : 'image/png',
          upsert: true
        });

      if (uploadError) {
        return { error: uploadError.message };
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return { url: publicUrl };
    } catch (err: any) {
      return { error: err.message || 'Failed to upload certificate file' };
    }
  }

  /**
   * Get current certificate counter without incrementing
   */
  static async getCurrentCertificateCount(eventId: string): Promise<{ count?: number; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('certificate_counters')
        .select('current_count')
        .eq('event_id', eventId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        return { error: error.message };
      }

      const currentCount = data?.current_count || 0;
      return { count: currentCount };
    } catch (err: any) {
      return { error: err.message || 'Failed to get certificate count' };
    }
  }

  /**
   * Increment certificate counter (call this only after successful certificate generation)
   */
  static async incrementCertificateCounter(eventId: string): Promise<{ success?: boolean; error?: string }> {
    try {
      // Call the database function to increment the counter
      const { data, error } = await supabase.rpc('get_next_certificate_number', {
        event_uuid: eventId
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { error: err.message || 'Failed to increment certificate counter' };
    }
  }

  /**
   * Get next certificate number for an event (with prefix and auto-incrementing counter)
   * @deprecated Use getCurrentCertificateCount + incrementCertificateCounter instead
   */
  static async getNextCertificateNumber(eventId: string, prefix: string = ''): Promise<{ number?: string; error?: string }> {
    try {
      // Call the database function to get and increment the counter
      const { data, error } = await supabase.rpc('get_next_certificate_number', {
        event_uuid: eventId
      });

      if (error) {
        return { error: error.message };
      }

      // Format the number with prefix
      const counter = data || 1;
      const formattedNumber = String(counter).padStart(3, '0');
      const certId = prefix ? `${prefix}-${formattedNumber}` : formattedNumber;

      return { number: certId };
    } catch (err: any) {
      return { error: err.message || 'Failed to generate certificate number' };
    }
  }

  /**
   * Verify certificate by certificate number (public method, no auth required)
   */
  static async verifyCertificate(certificateNumber: string): Promise<{ certificate?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          id,
          certificate_number,
          participant_name,
          event_title,
          completion_date,
          certificate_pdf_url,
          certificate_png_url,
          created_at,
          event_id
        `)
        .eq('certificate_number', certificateNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { error: 'Certificate not found. This certificate number does not exist in our database.' };
        }
        return { error: error.message };
      }

      if (!data) {
        return { error: 'Certificate not found' };
      }

      return { certificate: data };
    } catch (err: any) {
      return { error: err.message || 'Failed to verify certificate' };
    }
  }

  /**
   * Generate certificate number (legacy method - kept for backward compatibility)
   */
  static generateCertificateNumber(eventId: string, userId: string): string {
    const timestamp = Date.now();
    const shortEventId = eventId.substring(0, 8);
    const shortUserId = userId.substring(0, 8);
    return `CERT-${shortEventId}-${shortUserId}-${timestamp}`;
  }
}

