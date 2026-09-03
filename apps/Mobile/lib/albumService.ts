import { supabase } from './supabase';
import { Event } from './eventService';
import { NetworkStatusMonitor } from './offline/networkStatus';
import { SyncQueueService, SyncPriority } from './offline/syncQueue';
import { DataType } from './offline/conflictResolution';
import { LocalDatabaseService } from './offline/localDatabase';
import * as FileSystem from 'expo-file-system';

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
   * Supports offline queueing - photos are saved locally and queued for sync
   */
  static async uploadPhoto(
    fileUri: string,
    eventId: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; error?: string; queued?: boolean }> {
    try {
      // Convert file path to URI format for React Native
      const imageUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;

      onProgress?.(10);

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        return { success: false, error: 'Photo file not found' };
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${userId}_${timestamp}.jpg`;

      // If offline, save to local storage and queue for sync
      if (!NetworkStatusMonitor.isOnline()) {
        onProgress?.(30);

        // Copy photo to app's document directory for offline storage
        const offlinePhotoDir = `${FileSystem.documentDirectory}offline-photos/`;
        const dirInfo = await FileSystem.getInfoAsync(offlinePhotoDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(offlinePhotoDir, { intermediates: true });
        }

        const offlinePhotoPath = `${offlinePhotoDir}${eventId}_${filename}`;
        await FileSystem.copyAsync({
          from: imageUri,
          to: offlinePhotoPath,
        });

        onProgress?.(60);

        // Get file size
        const photoInfo = await FileSystem.getInfoAsync(offlinePhotoPath);
        const fileSize = photoInfo.exists && 'size' in photoInfo ? photoInfo.size : 0;

        // Save photo metadata to local database
        const photoId = `photo-${Date.now()}-${Math.random()}`;
        await LocalDatabaseService.savePhotoUpload({
          id: photoId,
          event_id: eventId,
          user_id: userId,
          local_file_path: offlinePhotoPath,
          file_name: filename,
          file_size: fileSize,
          status: 'pending',
        });

        onProgress?.(80);

        // Queue for sync
        await SyncQueueService.enqueue(
          DataType.IMAGE_UPLOAD,
          'create',
          'photo_uploads',
          {
            id: photoId,
            event_id: eventId,
            user_id: userId,
            local_file_path: offlinePhotoPath,
            file_name: filename,
            file_size: fileSize,
            uploaded_at: new Date().toISOString(),
          },
          SyncPriority.LOW // Photos are low priority (can be cached)
        );

        onProgress?.(100);
        return { success: true, queued: true };
      }

      // Online: Upload directly
      onProgress?.(20);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      onProgress?.(40);

      // Convert base64 to Uint8Array
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const bytes = new Uint8Array(byteNumbers);

      // Generate unique filename
      const storageFilename = `${eventId}/${filename}`;

      onProgress?.(60);

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(storageFilename, bytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      onProgress?.(90);

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      onProgress?.(100);
      return { success: true, queued: false };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload photo'
      };
    }
  }
}

