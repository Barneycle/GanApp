import { supabase } from './supabase';
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
      // First, try to get events with photos from a potential event_photos table
      // If that doesn't exist, we'll fall back to checking storage
      const { data: photosData, error: photosError } = await supabase
        .from('event_photos')
        .select(`
          id,
          event_id,
          photo_url,
          uploaded_by,
          uploaded_at,
          file_name,
          events (*)
        `)
        .order('uploaded_at', { ascending: false });

      if (photosError) {
        // If table doesn't exist, try alternative approach - check storage bucket
        console.log('event_photos table not found, trying storage bucket approach');
        return await this.getEventsWithPhotosFromStorage();
      }

      if (!photosData || photosData.length === 0) {
        return { events: [] };
      }

      // Group photos by event
      const eventsMap = new Map<string, EventWithPhotos>();

      photosData.forEach((photo: any) => {
        const event = photo.events as Event;
        if (!event) return;

        if (!eventsMap.has(event.id)) {
          eventsMap.set(event.id, {
            ...event,
            photos: [],
            photo_count: 0,
          });
        }

        const eventWithPhotos = eventsMap.get(event.id)!;
        eventWithPhotos.photos.push({
          id: photo.id,
          event_id: photo.event_id,
          photo_url: photo.photo_url,
          uploaded_by: photo.uploaded_by,
          uploaded_at: photo.uploaded_at,
          file_name: photo.file_name,
        });
        eventWithPhotos.photo_count = eventWithPhotos.photos.length;
      });

      const events = Array.from(eventsMap.values());
      return { events, error: undefined };
    } catch (error) {
      console.error('Error fetching events with photos:', error);
      return { events: [], error: error instanceof Error ? error.message : 'Failed to load albums' };
    }
  }

  /**
   * Alternative approach: Get events and check storage bucket for photos
   */
  static async getEventsWithPhotosFromStorage(): Promise<{ events: EventWithPhotos[]; error?: string }> {
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
      const { data, error } = await supabase
        .from('event_photos')
        .select('*')
        .eq('event_id', eventId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        // Fallback to storage
        return await this.getEventPhotosFromStorage(eventId);
      }

      return { photos: data || [], error: undefined };
    } catch (error) {
      return { photos: [], error: error instanceof Error ? error.message : 'Failed to load photos' };
    }
  }

  /**
   * Get photos for a specific event from storage
   */
  static async getEventPhotosFromStorage(eventId: string): Promise<{ photos: EventPhoto[]; error?: string }> {
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
}

