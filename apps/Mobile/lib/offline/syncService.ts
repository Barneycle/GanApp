import { supabase } from '../supabase';
import { NetworkStatusMonitor } from './networkStatus';
import { SyncQueueService, SyncOperation, SyncStatus, SyncPriority } from './syncQueue';
import { ConflictResolutionService, ConflictStrategy, DataType } from './conflictResolution';
import { LocalDatabaseService } from './localDatabase';

/**
 * Sync Service
 * Handles synchronization between local database and server
 */
export class SyncService {
  private static isSyncing = false;
  private static syncInterval: ReturnType<typeof setInterval> | null = null;
  private static listeners: Set<(status: { isSyncing: boolean; progress: number }) => void> = new Set();

  /**
   * Initialize sync service
   */
  static async initialize(): Promise<void> {
    // Initialize dependencies
    await NetworkStatusMonitor.initialize();
    await SyncQueueService.initialize();
    await LocalDatabaseService.initialize();

    // Start listening to network changes
    NetworkStatusMonitor.startListening();

    // Subscribe to network status
    NetworkStatusMonitor.subscribe((status) => {
      if (NetworkStatusMonitor.isOnline()) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    });

    // Start auto-sync if online
    if (NetworkStatusMonitor.isOnline()) {
      this.startAutoSync();
    }
  }

  /**
   * Start auto-sync (runs periodically when online)
   */
  static startAutoSync(): void {
    if (this.syncInterval) {
      return; // Already running
    }

    // Sync immediately
    this.sync();

    // Then sync every 30 seconds
    this.syncInterval = setInterval(() => {
      if (NetworkStatusMonitor.isOnline() && !this.isSyncing) {
        this.sync();
      }
    }, 30000) as any;
  }

  /**
   * Stop auto-sync
   */
  static stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Manual sync trigger
   */
  static async sync(): Promise<{ synced: number; failed: number; conflicts: number }> {
    if (!NetworkStatusMonitor.isOnline()) {
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    if (this.isSyncing) {
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners({ isSyncing: true, progress: 0 });

    try {
      const pending = SyncQueueService.getPendingOperations();
      let synced = 0;
      let failed = 0;
      let conflicts = 0;
      const syncedOperations: SyncOperation[] = [];
      const failedOperations: SyncOperation[] = [];

      for (let i = 0; i < pending.length; i++) {
        const operation = pending[i];
        this.notifyListeners({
          isSyncing: true,
          progress: (i / pending.length) * 100,
        });

        try {
          const result = await this.syncOperation(operation);
          if (result.success) {
            synced++;
            syncedOperations.push(operation);
            await SyncQueueService.updateOperationStatus(
              operation.id,
              SyncStatus.COMPLETED
            );
            await SyncQueueService.removeOperation(operation.id);
          } else if (result.conflict) {
            conflicts++;
            failedOperations.push(operation);
            // Conflict will be handled by conflict resolution
          } else {
            failed++;
            failedOperations.push(operation);
            await SyncQueueService.updateOperationStatus(
              operation.id,
              SyncStatus.FAILED,
              result.error
            );
          }
        } catch (error: any) {
          failed++;
          failedOperations.push(operation);
          await SyncQueueService.updateOperationStatus(
            operation.id,
            SyncStatus.FAILED,
            error.message
          );
        }

        SyncQueueService.markProcessingComplete();
      }

      // Also sync data from server to local (pull updates)
      await this.pullUpdates();

      // Send notifications about sync results
      if (pending.length > 0) {
        await this.sendSyncNotifications(synced, failed, conflicts, syncedOperations, failedOperations);
      }

      return { synced, failed, conflicts };
    } finally {
      this.isSyncing = false;
      this.notifyListeners({ isSyncing: false, progress: 100 });
    }
  }

  /**
   * Send notifications about sync results
   */
  private static async sendSyncNotifications(
    synced: number,
    failed: number,
    conflicts: number,
    syncedOperations: SyncOperation[],
    failedOperations: SyncOperation[]
  ): Promise<void> {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const { NotificationService } = await import('../notificationService');

      // Filter operations by current user
      const userSyncedOps = syncedOperations.filter(op => op.data.user_id === user.id);
      const userFailedOps = failedOperations.filter(op => op.data.user_id === user.id);

      if (userSyncedOps.length === 0 && userFailedOps.length === 0 && conflicts === 0) return;

      // Count synced operations by type
      const photoUploads = userSyncedOps.filter(op =>
        op.table === 'photo_uploads' || op.dataType === DataType.IMAGE_UPLOAD
      );
      const attendanceLogs = userSyncedOps.filter(op =>
        op.table === 'attendance_logs' || op.dataType === DataType.ATTENDANCE_RECORD
      );
      const surveyResponses = userSyncedOps.filter(op =>
        op.table === 'survey_responses' || op.dataType === DataType.SURVEY_RESPONSE
      );
      const registrations = userSyncedOps.filter(op =>
        op.table === 'event_registrations' || op.dataType === DataType.EVENT_REGISTRATION
      );
      const messages = userSyncedOps.filter(op =>
        op.table === 'event_messages'
      );

      // Send success notifications (only if there are synced operations)
      if (userSyncedOps.length > 0) {
        const successMessages: string[] = [];

        if (photoUploads.length > 0) {
          successMessages.push(`${photoUploads.length} photo(s) uploaded`);
        }
        if (attendanceLogs.length > 0) {
          successMessages.push(`${attendanceLogs.length} check-in(s) synced`);
        }
        if (surveyResponses.length > 0) {
          successMessages.push(`${surveyResponses.length} survey response(s) submitted`);
        }
        if (registrations.length > 0) {
          successMessages.push(`${registrations.length} registration(s) confirmed`);
        }
        if (messages.length > 0) {
          successMessages.push(`${messages.length} message(s) sent`);
        }

        if (successMessages.length > 0) {
          await NotificationService.createNotification(
            user.id,
            'Sync Complete',
            `Your offline actions have been synced: ${successMessages.join(', ')}.`,
            'success',
            {
              action_url: '/(tabs)/my-events',
              action_text: 'View Events',
              priority: 'normal'
            }
          );
        }
      }

      // Send failure notifications
      if (userFailedOps.length > 0) {
        await NotificationService.createNotification(
          user.id,
          'Sync Failed',
          `${userFailedOps.length} action(s) failed to sync. They will be retried automatically.`,
          'error',
          {
            action_url: '/(tabs)/notifications',
            action_text: 'View Details',
            priority: 'high'
          }
        );
      }

      // Send conflict notifications
      if (conflicts > 0) {
        await NotificationService.createNotification(
          user.id,
          'Sync Conflicts',
          `${conflicts} conflict(s) detected. Please review and resolve them.`,
          'warning',
          {
            action_url: '/(tabs)/notifications',
            action_text: 'Resolve Conflicts',
            priority: 'high'
          }
        );
      }
    } catch (error) {
      console.error('Failed to send sync notifications:', error);
      // Don't throw - notification failure shouldn't break sync
    }
  }

  /**
   * Sync a single operation
   */
  private static async syncOperation(
    operation: SyncOperation
  ): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
    try {
      switch (operation.operation) {
        case 'create':
          return await this.syncCreate(operation);

        case 'update':
          return await this.syncUpdate(operation);

        case 'delete':
          return await this.syncDelete(operation);

        default:
          return { success: false, error: 'Unknown operation type' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync create operation
   */
  private static async syncCreate(
    operation: SyncOperation
  ): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
    try {
      // For survey_responses, use upsert to handle last-write-wins
      if (operation.table === 'survey_responses' && operation.data.survey_id && operation.data.user_id) {
        const { data, error } = await supabase
          .from(operation.table)
          .upsert([operation.data], {
            onConflict: 'survey_id,user_id'
          })
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        // Mark as synced in local database
        if (data?.id) {
          await LocalDatabaseService.markSynced(operation.table, data.id);
        }

        // Send notification for successful survey submission
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id && operation.data.user_id === user.id) {
            const { NotificationService } = await import('../notificationService');
            const { data: survey } = await supabase
              .from('surveys')
              .select('event_id, title')
              .eq('id', operation.data.survey_id)
              .single();

            if (survey) {
              const { EventService } = await import('../eventService');
              const eventResult = await EventService.getEventById(survey.event_id);

              await NotificationService.createNotification(
                user.id,
                'Survey Submitted',
                `Your response for "${survey.title || eventResult.event?.title || 'the survey'}" has been successfully submitted.`,
                'success',
                {
                  action_url: `/evaluation?id=${operation.data.survey_id}`,
                  action_text: 'View Survey',
                  priority: 'normal'
                }
              );
            }
          }
        } catch (error) {
          console.error('Failed to send survey notification:', error);
          // Don't fail the sync if notification fails
        }

        return { success: true };
      }

      // For attendance_logs, validate QR code if it was queued offline
      if (operation.table === 'attendance_logs' && operation.data._qrValidationData) {
        const { QRScanService } = await import('../qrScanService');
        const qrValidation = operation.data._qrValidationData;

        // Parse QR data
        let parsedData;
        try {
          parsedData = JSON.parse(qrValidation.qrData);
        } catch {
          parsedData = { eventId: qrValidation.qrData, id: qrValidation.qrData };
        }

        // Validate QR code
        const validationResult = await QRScanService.validateQRCode(
          qrValidation.qrData,
          parsedData,
          operation.data.event_id,
          operation.data.user_id
        );

        if (!validationResult.valid) {
          return {
            success: false,
            error: validationResult.error || 'QR code validation failed',
          };
        }

        // Verify participant is registered
        const { data: registration, error: regError } = await supabase
          .from('event_registrations')
          .select('id, status')
          .eq('event_id', operation.data.event_id)
          .eq('user_id', operation.data.user_id)
          .eq('status', 'registered')
          .single();

        if (regError || !registration) {
          return {
            success: false,
            error: 'Not registered',
          };
        }

        // Remove validation data before inserting
        const { _qrValidationData, ...attendanceData } = operation.data;
        operation.data = {
          ...attendanceData,
          is_validated: true,
          validation_notes: 'QR code validated on sync'
        };

        // Send notification for successful check-in validation
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id && operation.data.user_id === user.id) {
            const { NotificationService } = await import('../notificationService');
            const { EventService } = await import('../eventService');
            const eventResult = await EventService.getEventById(operation.data.event_id);

            await NotificationService.createNotification(
              user.id,
              'Check-in Confirmed',
              `Your check-in for "${eventResult.event?.title || 'the event'}" has been validated and confirmed.`,
              'success',
              {
                action_url: `/event-details?eventId=${operation.data.event_id}`,
                action_text: 'View Event',
                priority: 'normal'
              }
            );
          }
        } catch (error) {
          console.error('Failed to send check-in notification:', error);
          // Don't fail the sync if notification fails
        }
      }

      // Handle photo uploads (special case - upload to storage)
      if (operation.table === 'photo_uploads' || operation.dataType === DataType.IMAGE_UPLOAD) {
        return await this.syncPhotoUpload(operation);
      }

      // Handle event registrations (special case - may need to handle cancelled registrations)
      if (operation.table === 'event_registrations' || operation.dataType === DataType.EVENT_REGISTRATION) {
        // For registrations, check if there's an existing registration
        if (operation.operation === 'create') {
          // Check if registration already exists (might have been created while offline)
          const { data: existing } = await supabase
            .from('event_registrations')
            .select('id, status')
            .eq('event_id', operation.data.event_id)
            .eq('user_id', operation.data.user_id)
            .maybeSingle();

          if (existing) {
            // If exists and is cancelled, update to registered
            if (existing.status === 'cancelled') {
              const { data, error } = await supabase
                .from('event_registrations')
                .update({ status: 'registered' })
                .eq('id', existing.id)
                .select()
                .single();

              if (error) {
                return { success: false, error: error.message };
              }

              if (data?.id) {
                await LocalDatabaseService.markSynced('event_registrations', data.id);
              }
              return { success: true };
            } else {
              // Already registered - mark as synced
              if (existing.id) {
                await LocalDatabaseService.markSynced('event_registrations', existing.id);
              }
              return { success: true };
            }
          }
        }
      }

      // Standard insert for other tables
      const { data, error } = await supabase
        .from(operation.table)
        .insert([operation.data])
        .select()
        .single();

      if (error) {
        // Check for conflict (duplicate key, etc.)
        if (error.code === '23505') {
          // Unique constraint violation - try update instead
          if (operation.data.id) {
            return await this.syncUpdate(operation);
          }
          return { success: false, conflict: true };
        }
        return { success: false, error: error.message };
      }

      // Mark as synced in local database
      if (data?.id) {
        await LocalDatabaseService.markSynced(operation.table, data.id);
      }

      // Send notification for successful registration sync
      if (operation.table === 'event_registrations' && operation.data.user_id) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id && operation.data.user_id === user.id) {
            const { NotificationService } = await import('../notificationService');
            const { EventService } = await import('../eventService');
            const eventResult = await EventService.getEventById(operation.data.event_id);

            await NotificationService.createNotification(
              user.id,
              'Registration Confirmed',
              `Your registration for "${eventResult.event?.title || 'the event'}" has been confirmed.`,
              'success',
              {
                action_url: `/event-details?eventId=${operation.data.event_id}`,
                action_text: 'View Event',
                priority: 'normal'
              }
            );
          }
        } catch (error) {
          console.error('Failed to send registration notification:', error);
          // Don't fail the sync if notification fails
        }
      }

      // Send notification for successful message sync
      if (operation.table === 'event_messages' && operation.data.user_id) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id && operation.data.sender_id === user.id) {
            const { NotificationService } = await import('../notificationService');
            const { EventService } = await import('../eventService');
            const eventResult = await EventService.getEventById(operation.data.event_id);

            await NotificationService.createNotification(
              user.id,
              'Message Sent',
              `Your message about "${eventResult.event?.title || 'the event'}" has been successfully sent.`,
              'success',
              {
                action_url: `/event-messages?eventId=${operation.data.event_id}`,
                action_text: 'View Messages',
                priority: 'low'
              }
            );
          }
        } catch (error) {
          console.error('Failed to send message notification:', error);
          // Don't fail the sync if notification fails
        }
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync update operation
   */
  private static async syncUpdate(
    operation: SyncOperation
  ): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
    try {
      // Check for conflicts first
      const { data: serverData, error: fetchError } = await supabase
        .from(operation.table)
        .select('*')
        .eq('id', operation.data.id)
        .single();

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      // Check for conflict
      const hasConflict = ConflictResolutionService.hasConflict(
        operation.data,
        serverData,
        operation.dataType
      );

      if (hasConflict) {
        // Resolve conflict
        const resolution = ConflictResolutionService.resolveConflict({
          local: operation.data,
          server: serverData,
          dataType: operation.dataType,
          timestamp: {
            local: operation.data.updated_at || operation.createdAt,
            server: serverData.updated_at || serverData.created_at,
          },
        });

        // If user needs to choose, mark as conflict
        if (resolution.strategy === ConflictStrategy.USER_CHOOSES) {
          await SyncQueueService.updateOperationStatus(
            operation.id,
            SyncStatus.CONFLICT,
            undefined,
            { local: operation.data, server: serverData }
          );
          return { success: false, conflict: true };
        }

        // Apply resolution
        operation.data = resolution.resolved;
      }

      // For event registrations, handle status updates specially
      if (operation.table === 'event_registrations' && operation.data.status) {
        // Update registration status
        const { error } = await supabase
          .from('event_registrations')
          .update({ status: operation.data.status })
          .eq('id', operation.data.id);

        if (error) {
          return { success: false, error: error.message };
        }

        // Mark as synced
        await LocalDatabaseService.markSynced(operation.table, operation.data.id);
        return { success: true };
      }

      // Perform update
      const { error } = await supabase
        .from(operation.table)
        .update(operation.data)
        .eq('id', operation.data.id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Mark as synced
      await LocalDatabaseService.markSynced(operation.table, operation.data.id);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync delete operation
   */
  private static async syncDelete(
    operation: SyncOperation
  ): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from(operation.table)
        .delete()
        .eq('id', operation.data.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync photo upload operation
   */
  private static async syncPhotoUpload(
    operation: SyncOperation
  ): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
    try {
      const photoData = operation.data;
      const { local_file_path, file_name, event_id, user_id } = photoData;

      // Read file from local storage
      const FileSystem = require('expo-file-system');
      const fileUri = local_file_path.startsWith('file://')
        ? local_file_path
        : `file://${local_file_path}`;

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        return {
          success: false,
          error: 'Photo file not found. It may have been deleted.',
        };
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to Uint8Array
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const bytes = new Uint8Array(byteNumbers);

      // Upload to Supabase storage
      // Use KEEP_BOTH strategy - if file exists, append timestamp
      const timestamp = Date.now();
      const filename = file_name.includes('_')
        ? file_name // Already has timestamp
        : `${event_id}/${user_id}_${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(filename, bytes, {
          contentType: 'image/jpeg',
          upsert: false, // Don't overwrite - keep both
        });

      if (uploadError) {
        // If file already exists (KEEP_BOTH strategy), try with new timestamp
        if (uploadError.message.includes('already exists') || uploadError.message.includes('duplicate')) {
          const newFilename = `${event_id}/${user_id}_${Date.now()}.jpg`;
          const { error: retryError } = await supabase.storage
            .from('event-photos')
            .upload(newFilename, bytes, {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (retryError) {
            return { success: false, error: retryError.message };
          }
        } else {
          return { success: false, error: uploadError.message };
        }
      }

      // Mark as synced in local database
      if (photoData.id) {
        await LocalDatabaseService.markPhotoSynced(photoData.id);
      }

      // Send notification for successful photo upload
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id && photoData.user_id === user.id) {
          const { NotificationService } = await import('../notificationService');
          const { EventService } = await import('../eventService');
          const eventResult = await EventService.getEventById(photoData.event_id);

          await NotificationService.createNotification(
            user.id,
            'Photo Uploaded',
            `Your photo for "${eventResult.event?.title || 'the event'}" has been successfully uploaded.`,
            'success',
            {
              action_url: `/event-details?eventId=${photoData.event_id}`,
              action_text: 'View Event',
              priority: 'low'
            }
          );
        }
      } catch (error) {
        console.error('Failed to send photo upload notification:', error);
        // Don't fail the upload if notification fails
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Pull updates from server
   */
  private static async pullUpdates(): Promise<void> {
    try {
      // Pull recent events
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (events) {
        for (const event of events) {
          await LocalDatabaseService.saveEvent(event);
        }
      }
    } catch (error) {
      console.error('Error pulling updates:', error);
    }
  }

  /**
   * Subscribe to sync status
   */
  static subscribe(
    callback: (status: { isSyncing: boolean; progress: number }) => void
  ): () => void {
    this.listeners.add(callback);
    callback({ isSyncing: this.isSyncing, progress: 0 });

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify listeners
   */
  private static notifyListeners(status: {
    isSyncing: boolean;
    progress: number;
  }): void {
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }
}
