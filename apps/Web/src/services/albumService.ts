import { supabase } from '../lib/supabaseClient';
import { Event } from './eventService';

export interface EventPhoto {
  id: string;
  event_id: string;
  photo_url: string;
  uploaded_by: string;
  uploaded_at: string;
  file_name?: string;
}

export interface EventWithPhotos extends Event {
  photos: EventPhoto[];
  photo_count: number;
}

export class AlbumService {
  /**
   * Get all events that have photos uploaded by participants
   */
  static async getEventsWithPhotos(): Promise<{ events: EventWithPhotos[]; error?: string }> {
    try {
      // Get all published events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('start_date', { ascending: false });

      if (eventsError) {
        return { events: [], error: eventsError.message };
      }

      if (!events || events.length === 0) {
        return { events: [] };
      }

      // Check storage bucket for photos (assuming bucket name is 'event-photos')
      const eventsWithPhotos: EventWithPhotos[] = [];

      for (const event of events) {
        try {
          // List files in the event's folder in storage
          const { data: files, error: listError } = await supabase.storage
            .from('event-photos')
            .list(event.id, {
              limit: 100,
              offset: 0,
            });

          if (!listError && files && files.length > 0) {
            // Get public URLs for the photos
            const photos: EventPhoto[] = files
              .filter(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
              .map(file => ({
                id: file.id || `${event.id}-${file.name}`,
                event_id: event.id,
                photo_url: supabase.storage.from('event-photos').getPublicUrl(`${event.id}/${file.name}`).data.publicUrl,
                uploaded_by: '', // Not available from storage metadata
                uploaded_at: file.created_at || new Date().toISOString(),
                file_name: file.name,
              }));

            if (photos.length > 0) {
              eventsWithPhotos.push({
                ...event,
                photos,
                photo_count: photos.length,
              });
            }
          }
        } catch (err) {
          // Skip events where we can't access photos
          console.log(`Could not load photos for event ${event.id}:`, err);
        }
      }

      return { events: eventsWithPhotos, error: undefined };
    } catch (error) {
      console.error('Error fetching events with photos from storage:', error);
      return { events: [], error: error instanceof Error ? error.message : 'Failed to load albums' };
    }
  }

  /**
   * Get photos for a specific event
   */
  static async getEventPhotos(eventId: string): Promise<{ photos: EventPhoto[]; error?: string }> {
    try {
      const { data: files, error } = await supabase.storage
        .from('event-photos')
        .list(eventId, {
          limit: 100,
          offset: 0,
        });

      if (error) {
        return { photos: [], error: error.message };
      }

      if (!files || files.length === 0) {
        return { photos: [] };
      }

      const photos: EventPhoto[] = files
        .filter(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
        .map(file => ({
          id: file.id || `${eventId}-${file.name}`,
          event_id: eventId,
          photo_url: supabase.storage.from('event-photos').getPublicUrl(`${eventId}/${file.name}`).data.publicUrl,
          uploaded_by: '',
          uploaded_at: file.created_at || new Date().toISOString(),
          file_name: file.name,
        }));

      return { photos, error: undefined };
    } catch (error) {
      return { photos: [], error: error instanceof Error ? error.message : 'Failed to load photos' };
    }
  }

  /**
   * Check how many photos a user has uploaded for an event
   */
  static async getUserPhotoCount(eventId: string, userId: string): Promise<{ count: number; error?: string }> {
    try {
      const { data: files, error } = await supabase.storage
        .from('event-photos')
        .list(eventId, {
          limit: 100,
          offset: 0,
        });

      if (error) {
        return { count: 0, error: error.message };
      }

      // Count files that match the user ID pattern (userId_timestamp.jpg)
      // Match mobile app pattern exactly: files starting with userId_ and ending with .jpg
      const userPhotoCount = files?.filter(file => 
        file.name.startsWith(`${userId}_`) && file.name.endsWith('.jpg')
      ).length || 0;

      return { count: userPhotoCount };
    } catch (error) {
      return { count: 0, error: error instanceof Error ? error.message : 'Failed to check photo count' };
    }
  }

  /**
   * Upload a photo to an event album
   */
  static async uploadPhoto(
    file: File,
    eventId: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Compress image before upload
      const compressedFile = await this.compressImage(file);
      
      onProgress?.(20);

      // Generate unique filename (always .jpg to match mobile app)
      const timestamp = Date.now();
      const filename = `${eventId}/${userId}_${timestamp}.jpg`;

      onProgress?.(40);

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(filename, compressedFile, {
          contentType: compressedFile.type,
          upsert: false,
        });

      onProgress?.(90);

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      onProgress?.(100);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload photo' 
      };
    }
  }

  /**
   * Compress image file for web
   */
  private static async compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if larger than maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}

