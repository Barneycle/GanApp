import { supabase } from '../lib/supabaseClient';
import { CacheService } from './cacheService';

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
  title_font_family?: string;
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
      // Check cache first
      const cacheKey = CacheService.keys.certificateConfig(eventId);
      const cached = await CacheService.get<CertificateConfig>(cacheKey);
      if (cached) {
        return { config: cached };
      }

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

      // Cache the result
      await CacheService.set(cacheKey, data, CacheService.TTL.MEDIUM);

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

        // Invalidate cache
        await CacheService.delete(CacheService.keys.certificateConfig(eventId));

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

        // Invalidate cache
        await CacheService.delete(CacheService.keys.certificateConfig(eventId));

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
   * Get all certificates for a user with event details
   */
  static async getUserCertificates(userId: string): Promise<{ certificates?: Array<Certificate & { event?: any }>; error?: string }> {
    try {
      // Get all certificates for the user
      const { data: certificates, error: certError } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false });

      if (certError) {
        return { error: certError.message };
      }

      if (!certificates || certificates.length === 0) {
        return { certificates: [] };
      }

      // Collect unique event IDs
      const eventIds = [...new Set(certificates.map(cert => cert.event_id))];

      // Batch fetch active events
      const { data: activeEvents } = await supabase
        .from('events')
        .select('id, title, start_date, end_date, status, venue')
        .in('id', eventIds);

      // Batch fetch archived events
      const { data: archivedEvents } = await supabase
        .from('archived_events')
        .select('original_event_id, title, start_date, end_date, status, venue, archived_at')
        .in('original_event_id', eventIds);

      // Create maps for quick lookup
      const activeEventsMap = new Map(
        (activeEvents || []).map(event => [event.id, event])
      );
      const archivedEventsMap = new Map(
        (archivedEvents || []).map(event => [event.original_event_id, event])
      );

      // Combine certificates with event details
      const certificatesWithEvents = certificates.map((cert) => {
        // Try active events first
        const activeEvent = activeEventsMap.get(cert.event_id);
        if (activeEvent) {
          return {
            ...cert,
            event: activeEvent
          };
        }

        // Try archived events
        const archivedEvent = archivedEventsMap.get(cert.event_id);
        if (archivedEvent) {
          return {
            ...cert,
            event: {
              id: archivedEvent.original_event_id,
              title: archivedEvent.title,
              start_date: archivedEvent.start_date,
              end_date: archivedEvent.end_date,
              status: archivedEvent.status,
              venue: archivedEvent.venue,
              archived_at: archivedEvent.archived_at
            }
          };
        }

        // If event not found in either table, return certificate without event details
        return {
          ...cert,
          event: null
        };
      });

      return { certificates: certificatesWithEvents };
    } catch (err: any) {
      return { error: err.message || 'Failed to fetch user certificates' };
    }
  }

  /**
   * Save generated certificate to database
   */
  static async saveCertificate(
    certificateData: {
      event_id: string | null;
      user_id: string;
      certificate_number: string;
      participant_name: string;
      event_title: string;
      completion_date: string;
      certificate_pdf_url?: string;
      certificate_png_url?: string;
      certificate_template_id?: string;
    }
  ): Promise<{ certificate?: Certificate; error?: string }> {
    try {
      // Check if certificate already exists by certificate_number (unique constraint)
      // This handles both event-based and standalone certificates correctly
      let existing: { certificate?: Certificate; error?: string } = { certificate: undefined };
      
      // First check by certificate_number (most reliable, works for all cases)
      const { data: existingByNumber, error: numberError } = await supabase
        .from('certificates')
        .select('*')
        .eq('certificate_number', certificateData.certificate_number)
        .maybeSingle();

      if (numberError && numberError.code !== 'PGRST116') {
        // Error other than "not found" - log but continue to create new certificate
        console.error('Error checking certificate by number:', numberError);
        // Fall through to create new certificate
      }
      
      if (existingByNumber) {
        // Certificate with this number already exists - update it
        const updateData: any = {
          certificate_pdf_url: certificateData.certificate_pdf_url,
          certificate_png_url: certificateData.certificate_png_url
        };
        
        // Only update template_id if provided
        if (certificateData.certificate_template_id) {
          updateData.certificate_template_id = certificateData.certificate_template_id;
        }
        
        const { data: updatedCert, error } = await supabase
          .from('certificates')
          .update(updateData)
          .eq('id', existingByNumber.id)
          .select()
          .single();

        if (error) {
          return { error: error.message };
        }

        console.log('[saveCertificate] Updated existing certificate by number:', existingByNumber.id);
        return { certificate: updatedCert as Certificate };
      } else {
        // No certificate with this number exists - check if there's one with same (event_id, user_id)
        // This handles the UNIQUE(event_id, user_id) constraint
        let existingByEventUser: any = null;
        if (certificateData.event_id) {
          const { data: existing, error: eventUserError } = await supabase
            .from('certificates')
            .select('*')
            .eq('event_id', certificateData.event_id)
            .eq('user_id', certificateData.user_id)
            .maybeSingle();

          if (!eventUserError && existing) {
            existingByEventUser = existing;
            console.log('[saveCertificate] Found existing certificate by (event_id, user_id), will update:', existing.id);
          }
        }

        // Get certificate template ID if not provided
        let templateId = certificateData.certificate_template_id;
        
        // If template ID not provided but event_id exists, get template from event
        if (!templateId && certificateData.event_id) {
          console.log('[saveCertificate] Attempting to fetch template for event:', certificateData.event_id);
          const { data: templates, error: templateError } = await supabase
            .from('certificate_templates')
            .select('id')
            .eq('event_id', certificateData.event_id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle(); // Use maybeSingle to handle no results gracefully

          if (templateError) {
            console.error('[saveCertificate] Error fetching template:', templateError);
            return { error: `Failed to fetch certificate template: ${templateError.message || 'Unknown error'}` };
          } else if (templates) {
            templateId = templates.id;
            console.log('[saveCertificate] Found template ID:', templateId);
          } else {
            // No template found - this is OK for events using certificate configs
            // The certificate_template_id column should be nullable to support this
            // Don't try to create a template automatically as participants don't have permission
            console.log('[saveCertificate] No template found for event:', certificateData.event_id, '- proceeding without template_id (using certificate config)');
            templateId = undefined; // Leave as undefined so it's not included in the insert
          }
        }

        // If there's an existing certificate with same (event_id, user_id), update it
        // This handles the UNIQUE(event_id, user_id) constraint for organizer-generated certificates
        if (existingByEventUser) {
          const updateData: any = {
            certificate_number: certificateData.certificate_number,
            participant_name: certificateData.participant_name,
            event_title: certificateData.event_title,
            completion_date: certificateData.completion_date,
            certificate_pdf_url: certificateData.certificate_pdf_url,
            certificate_png_url: certificateData.certificate_png_url
          };
          
          // Only update template_id if provided
          if (templateId) {
            updateData.certificate_template_id = templateId;
          }

          const { data: updatedCert, error: updateError } = await supabase
            .from('certificates')
            .update(updateData)
            .eq('id', existingByEventUser.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating certificate:', updateError);
            return { error: updateError.message };
          }

          console.log('[saveCertificate] Updated existing certificate by (event_id, user_id):', existingByEventUser.id);
          return { certificate: updatedCert as Certificate };
        }

        // Create new certificate
        // Note: certificate_template_id is nullable in the database (for events using configs)
        const insertData: any = {
          ...certificateData,
          generated_by: certificateData.user_id
        };
        
        // Only include template_id if we have one (it's nullable)
        if (templateId) {
          insertData.certificate_template_id = templateId;
        }

        const { data, error } = await supabase
          .from('certificates')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('Error saving certificate:', error);
          return { error: error.message };
        }

        return { certificate: data as Certificate };
      }
    } catch (err: any) {
      return { error: err.message || 'Failed to save certificate' };
    }
  }

  /**
   * Create a template for an existing event (when template is missing)
   * This is needed because events using certificate configs don't have template records
   */
  static async createTemplateForEvent(eventId: string, userId: string): Promise<{ templateId?: string; error?: string }> {
    try {
      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('title')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return { error: 'Event not found' };
      }

      // Create a placeholder template for this event
      // This is needed because the database requires certificate_template_id
      const { data: newTemplate, error: createTemplateError } = await supabase
        .from('certificate_templates')
        .insert({
          event_id: eventId,
          title: `Certificate Template for ${event.title}`,
          description: `Auto-generated template for ${event.title} (uses certificate config)`,
          template_url: 'https://placeholder-url-for-certificate-templates',
          template_type: 'document',
          content_fields: {
            participant_name: '{{name}}',
            event_title: '{{event}}',
            date: '{{date}}'
          },
          requires_attendance: false,
          requires_survey_completion: false,
          is_active: true,
          created_by: userId
        })
        .select('id')
        .single();

      if (createTemplateError || !newTemplate) {
        console.error('Failed to create template for event:', createTemplateError);
        return { error: createTemplateError?.message || 'Failed to create template' };
      }

      return { templateId: newTemplate.id };
    } catch (err: any) {
      console.error('Error creating template for event:', err);
      return { error: err.message || 'Failed to create template' };
    }
  }

  /**
   * Create a template for standalone certificates (when no event is selected)
   * Creates a minimal event and template for standalone certificate generation
   */
  static async createStandaloneTemplate(userId: string, eventTitle: string): Promise<{ templateId?: string; eventId?: string; error?: string }> {
    try {
      // Create a minimal event for standalone certificates
      const { data: newEvent, error: createEventError } = await supabase
        .from('events')
        .insert({
          title: eventTitle || 'Standalone Certificate',
          description: 'Event created for standalone certificate generation',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          venue: 'Standalone',
          created_by: userId,
          is_active: false, // Mark as inactive so it doesn't show in event lists
          event_type: 'standalone'
        })
        .select('id')
        .single();

      if (createEventError || !newEvent) {
        console.error('Failed to create standalone event:', createEventError);
        return { error: createEventError?.message || 'Failed to create event for standalone certificate' };
      }

      const eventId = newEvent.id;

      // Create a template for this standalone event
      const { data: newTemplate, error: createTemplateError } = await supabase
        .from('certificate_templates')
        .insert({
          event_id: eventId,
          title: 'Standalone Certificate Template',
          description: `Template for standalone certificate: ${eventTitle}`,
          template_url: 'https://placeholder-url-for-standalone-certificates',
          template_type: 'document',
          content_fields: {
            participant_name: '{{name}}',
            event_title: '{{event}}',
            date: '{{date}}'
          },
          requires_attendance: false,
          requires_survey_completion: false,
          is_active: true,
          created_by: userId
        })
        .select('id')
        .single();

      if (createTemplateError || !newTemplate) {
        console.error('Failed to create standalone template:', createTemplateError);
        return { error: createTemplateError?.message || 'Failed to create template for standalone certificate' };
      }

      return { templateId: newTemplate.id, eventId: eventId };
    } catch (err: any) {
      console.error('Error creating standalone template:', err);
      return { error: err.message || 'Failed to create standalone template' };
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
          generated_at,
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

