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

const ALBUM_EVENT_COLUMNS =
  'id, title, venue, start_date, end_date, start_time, end_time, banner_url, status';
const ALBUM_PHOTO_COLUMNS = 'id, event_id, photo_url, user_id, created_at, uploaded_at';
const ALBUM_LIST_SELECT = `${ALBUM_EVENT_COLUMNS}, event_photos!inner(${ALBUM_PHOTO_COLUMNS})`;
const IMAGE_NAME = /\.(jpg|jpeg|png|gif|webp)$/i;

export class AlbumService {
  private static mapPhotoRow(row: Record<string, any>, fallbackEventId = ''): EventPhoto {
    return {
      id: row.id,
      event_id: row.event_id || fallbackEventId,
      photo_url: row.photo_url || row.photo_url_public || '',
      uploaded_by: row.user_id || row.uploaded_by || '',
      uploaded_at: row.uploaded_at || row.created_at || new Date().toISOString(),
      file_name: row.file_name,
    };
  }

  private static mapEventsWithEmbeddedPhotos(rows: any[] | null): EventWithPhotos[] {
    return (rows || [])
      .map((row) => {
        const { event_photos: embedded, ...event } = row || {};
        const photos = (Array.isArray(embedded) ? embedded : [])
          .map((photo) => this.mapPhotoRow(photo, event.id))
          .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
        return { ...event, photos, photo_count: photos.length } as EventWithPhotos;
      })
      .filter((event) => event.photo_count > 0);
  }

  private static filesToPhotos(eventId: string, files: any[] | null): EventPhoto[] {
    return (files || [])
      .filter((file) => IMAGE_NAME.test(file?.name || ''))
      .map((file) => ({
        id: file.id || `${eventId}-${file.name}`,
        event_id: eventId,
        photo_url: supabase.storage.from('event-photos').getPublicUrl(`${eventId}/${file.name}`).data.publicUrl,
        uploaded_by: '',
        uploaded_at: file.created_at || new Date().toISOString(),
        file_name: file.name,
      }));
  }

  private static async fetchAlbumsFromTable(
    eventLimit?: number
  ): Promise<{ events: EventWithPhotos[]; error?: string; usedTable: boolean }> {
    let query = supabase
      .from('events')
      .select(ALBUM_LIST_SELECT)
      .eq('status', 'published')
      .order('start_date', { ascending: false });

    if (typeof eventLimit === 'number') {
      query = query.limit(eventLimit);
    }

    const { data, error } = await query;
    if (error) {
      return { events: [], error: error.message, usedTable: false };
    }

    const events = this.mapEventsWithEmbeddedPhotos(data);
    return { events, usedTable: events.length > 0 };
  }

  private static async listStorageFolders(): Promise<{ ids: string[]; ok: boolean }> {
    const { data, error } = await supabase.storage.from('event-photos').list('', { limit: 200 });
    if (error || !data) {
      return { ids: [], ok: false };
    }
    return {
      ok: true,
      ids: data
        .filter((entry) => {
          const looksLikeFolder = entry.id == null || !entry.metadata;
          return looksLikeFolder && /^[0-9a-f-]{36}$/i.test(entry.name);
        })
        .map((entry) => entry.name),
    };
  }

  private static async attachStoragePhotos(
    events: Array<Record<string, any>>
  ): Promise<EventWithPhotos[]> {
    const listed = await Promise.all(
      events.map(async (event) => {
        try {
          const { data: files, error } = await supabase.storage
            .from('event-photos')
            .list(event.id, { limit: 100, offset: 0 });
          if (error) {
            return null;
          }
          const photos = this.filesToPhotos(event.id, files);
          if (photos.length === 0) {
            return null;
          }
          return { ...event, photos, photo_count: photos.length } as EventWithPhotos;
        } catch {
          return null;
        }
      })
    );
    return listed.filter((event): event is EventWithPhotos => event != null);
  }

  private static async fetchAlbumsFromStorage(
    eventLimit?: number
  ): Promise<{ events: EventWithPhotos[]; error?: string }> {
    const folders = await this.listStorageFolders();
    if (folders.ok && folders.ids.length === 0) {
      return { events: [] };
    }

    let eventQuery = supabase
      .from('events')
      .select(ALBUM_EVENT_COLUMNS)
      .eq('status', 'published')
      .order('start_date', { ascending: false });

    if (folders.ok && folders.ids.length > 0) {
      eventQuery = eventQuery.in('id', folders.ids);
      if (typeof eventLimit === 'number') {
        eventQuery = eventQuery.limit(eventLimit);
      }
    }

    const { data: events, error } = await eventQuery;
    if (error) {
      return { events: [], error: error.message };
    }
    if (!events || events.length === 0) {
      return { events: [] };
    }

    const withPhotos = await this.attachStoragePhotos(events);
    return {
      events: typeof eventLimit === 'number' ? withPhotos.slice(0, eventLimit) : withPhotos,
    };
  }

  /**
   * Get published events that have photos. One round-trip via embedded
   * event_photos when the tracking table is populated; otherwise a slim
   * events query plus parallel storage listings (not one-per-event sequential).
   */
  static async getEventsWithPhotos(): Promise<{ events: EventWithPhotos[]; error?: string }> {
    try {
      const fromTable = await this.fetchAlbumsFromTable();
      if (fromTable.usedTable) {
        return { events: fromTable.events };
      }

      return this.fetchAlbumsFromStorage();
    } catch (error) {
      console.error('Error fetching events with photos:', error);
      return { events: [], error: error instanceof Error ? error.message : 'Failed to load albums' };
    }
  }

  /**
   * A few recent albums for the home teaser. Does not load the full catalog.
   */
  static async getAlbumHighlights(limit = 3): Promise<{ events: EventWithPhotos[]; error?: string }> {
    try {
      const fromTable = await this.fetchAlbumsFromTable(limit);
      if (fromTable.usedTable) {
        return { events: fromTable.events.slice(0, limit) };
      }
      if (fromTable.error && /could not find|relationship|schema cache/i.test(fromTable.error)) {
        // Fall through to storage when the embed is unavailable.
      } else if (fromTable.error) {
        return { events: [], error: fromTable.error };
      }

      const fromStorage = await this.fetchAlbumsFromStorage(limit);
      if (fromStorage.error) {
        return { events: [], error: fromStorage.error };
      }
      return { events: (fromStorage.events || []).slice(0, limit) };
    } catch (error) {
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

      const photoUrl = supabase.storage.from('event-photos').getPublicUrl(filename).data.publicUrl;
      const { error: insertError } = await supabase.from('event_photos').insert({
        event_id: eventId,
        user_id: userId,
        photo_url: photoUrl,
      });
      if (insertError) {
        console.warn('Photo uploaded but tracking row was not saved:', insertError.message);
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

