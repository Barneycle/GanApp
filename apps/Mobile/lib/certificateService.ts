import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import { NetworkStatusMonitor } from './offline/networkStatus';
import { LocalDatabaseService } from './offline/localDatabase';

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
    sponsor_logos?: string[];
    sponsor_logo_size?: { width: number; height: number };
    sponsor_logo_position?: { x: number; y: number };
    sponsor_logo_spacing?: number;
  };
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
  static async getUserCertificates(userId: string): Promise<{ certificates?: Array<Certificate & { event?: any }>; error?: string; fromCache?: boolean }> {
    try {
      // Try to fetch from server if online
      if (NetworkStatusMonitor.isOnline()) {
        try {
          // Get all certificates for the user
          const { data: certificates, error: certError } = await supabase
            .from('certificates')
            .select('*')
            .eq('user_id', userId)
            .order('generated_at', { ascending: false });

          if (certError) {
            // Fall through to cache
          } else if (certificates) {
            // Save certificates to local database
            for (const cert of certificates) {
              await LocalDatabaseService.saveCertificate({
                id: cert.id,
                event_id: cert.event_id,
                user_id: cert.user_id,
                certificate_url: cert.certificate_pdf_url || cert.certificate_png_url || '',
                issued_at: cert.generated_at || cert.created_at,
              });
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

            return { certificates: certificatesWithEvents, fromCache: false };
          }
        } catch (error) {
          console.error('Network error, falling back to cache:', error);
          // Fall through to cache
        }
      }

      // Fallback to local database
      const cachedCertificates = await LocalDatabaseService.getCertificates(userId);
      const certificatesWithEvents = [];

      for (const cert of cachedCertificates) {
        const event = await LocalDatabaseService.getEventById(cert.event_id);
        certificatesWithEvents.push({
          ...cert,
          certificate_pdf_url: cert.certificate_url,
          certificate_png_url: cert.certificate_url,
          generated_at: cert.issued_at,
          event: event || null,
        });
      }

      return { certificates: certificatesWithEvents as any, fromCache: true };
    } catch (err: any) {
      return { error: err.message || 'Failed to fetch user certificates' };
    }
  }

  /**
   * Check if a certificate already exists for a participant name and event
   */
  static async getCertificateByParticipantName(
    participantName: string,
    eventId: string
  ): Promise<{ certificate?: Certificate; error?: string }> {
    try {
      const trimmedName = participantName.trim();

      const { data, error } = await supabase
        .from('certificates')
        .select('id, certificate_number, participant_name, event_id, user_id')
        .eq('event_id', eventId)
        .eq('participant_name', trimmedName)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          return { certificate: undefined };
        }
        return { error: error.message };
      }

      return { certificate: data as Certificate | undefined };
    } catch (err: any) {
      return { error: err.message || 'Failed to check certificate by participant name' };
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
      certificate_template_id?: string;
    }
  ): Promise<{ certificate?: Certificate; error?: string }> {
    try {
      // First check by certificate_number (unique constraint)
      const { data: existingByNumber, error: numberError } = await supabase
        .from('certificates')
        .select('*')
        .eq('certificate_number', certificateData.certificate_number)
        .maybeSingle();

      if (numberError && numberError.code !== 'PGRST116') {
        console.error('[Mobile CertificateService] Error checking certificate by number:', numberError);
      }

      if (existingByNumber) {
        // Certificate with this number already exists - return it without updating
        console.log('[Mobile CertificateService] Certificate with this number already exists:', existingByNumber.id);
        return { certificate: existingByNumber as Certificate };
      }

      // Check if certificate already exists by (event_id, participant_name)
      // This is the primary duplicate check that works for both registered users and manual entries
      const existingByName = await this.getCertificateByParticipantName(
        certificateData.participant_name,
        certificateData.event_id
      );

      if (existingByName.error) {
        console.error('[Mobile CertificateService] Error checking certificate by participant_name:', existingByName.error);
      }

      if (existingByName.certificate) {
        // Certificate already exists for this participant and event - return it
        console.log('[Mobile CertificateService] Certificate already exists for participant:', existingByName.certificate.id);
        return { certificate: existingByName.certificate };
      }

      // No duplicate found - create new certificate
      const insertData: any = {
        event_id: certificateData.event_id,
        user_id: certificateData.user_id,
        certificate_number: certificateData.certificate_number,
        participant_name: certificateData.participant_name.trim(),
        event_title: certificateData.event_title,
        completion_date: certificateData.completion_date,
        certificate_pdf_url: certificateData.certificate_pdf_url,
        certificate_png_url: certificateData.certificate_png_url,
        generated_by: certificateData.user_id
      };

      // Only include template_id if provided (it's nullable)
      if (certificateData.certificate_template_id) {
        insertData.certificate_template_id = certificateData.certificate_template_id;
      }

      console.log('[Mobile CertificateService] Inserting new certificate:', {
        certificate_number: insertData.certificate_number,
        participant_name: insertData.participant_name,
        event_id: insertData.event_id
      });

      const { data, error } = await supabase
        .from('certificates')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[Mobile CertificateService] Error inserting certificate:', error);
        console.error('[Mobile CertificateService] Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return { error: error.message };
      }

      if (!data) {
        console.error('[Mobile CertificateService] Insert succeeded but no data returned');
        return { error: 'Certificate insert completed but no certificate was returned' };
      }

      console.log('[Mobile CertificateService] Certificate inserted successfully:', {
        id: data.id,
        certificate_number: data.certificate_number,
        participant_name: data.participant_name
      });

      return { certificate: data as Certificate };
    } catch (err: any) {
      console.error('[Mobile CertificateService] Exception in saveCertificate:', err);
      return { error: err.message || 'Failed to save certificate' };
    }
  }

  /**
   * Upload certificate file to storage
   */
  static async uploadCertificateFile(
    fileUri: string,
    fileName: string,
    format: 'pdf' | 'png',
    eventId: string,
    userId: string
  ): Promise<{ url?: string; error?: string }> {
    try {
      const bucketName = 'generated-certificates';
      // Path format: certificates/{eventId}/{userId}/{fileName} to match RLS policy
      const filePath = `certificates/${eventId}/${userId}/${fileName}`;

      // For React Native, read the file using FileSystem
      const normalizedUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;

      // Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(normalizedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer/Uint8Array for Supabase
      // Use a simple base64 decoder that works in React Native
      const base64Decode = (str: string): Uint8Array => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let output = '';

        str = str.replace(/[^A-Za-z0-9\+\/\=]/g, '');

        for (let i = 0; i < str.length; i += 4) {
          const enc1 = chars.indexOf(str.charAt(i));
          const enc2 = chars.indexOf(str.charAt(i + 1));
          const enc3 = chars.indexOf(str.charAt(i + 2));
          const enc4 = chars.indexOf(str.charAt(i + 3));

          const chr1 = (enc1 << 2) | (enc2 >> 4);
          const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
          const chr3 = ((enc3 & 3) << 6) | enc4;

          output += String.fromCharCode(chr1);
          if (enc3 !== 64) output += String.fromCharCode(chr2);
          if (enc4 !== 64) output += String.fromCharCode(chr3);
        }

        const bytes = new Uint8Array(output.length);
        for (let i = 0; i < output.length; i++) {
          bytes[i] = output.charCodeAt(i);
        }
        return bytes;
      };

      const byteArray = base64Decode(base64Data);

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, byteArray, {
          contentType: format === 'pdf' ? 'application/pdf' : 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { error: uploadError.message };
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return { url: publicUrl };
    } catch (err: any) {
      console.error('Upload exception:', err);
      return { error: err.message || 'Failed to upload certificate file' };
    }
  }

  /**
   * Generate certificate number
   */
  static generateCertificateNumber(eventId: string, userId: string): string {
    const timestamp = Date.now();
    const shortEventId = eventId.substring(0, 8);
    const shortUserId = userId.substring(0, 8);
    return `CERT-${shortEventId}-${shortUserId}-${timestamp}`;
  }
}

