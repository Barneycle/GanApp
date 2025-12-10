import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

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

