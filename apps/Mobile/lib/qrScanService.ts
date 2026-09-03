import { supabase } from './supabase';
import { NetworkStatusMonitor } from './offline/networkStatus';
import { LocalDatabaseService } from './offline/localDatabase';
import { SyncQueueService, SyncPriority } from './offline/syncQueue';
import { DataType } from './offline/conflictResolution';

export interface QRScanResult {
  success: boolean;
  event?: {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    venue: string;
    max_participants?: number;
    current_participants: number;
  };
  attendanceLog?: {
    id: string;
    check_in_time: string;
    check_in_method: string;
    is_validated: boolean;
  };
  error?: string;
  message?: string;
}

export interface QRScanData {
  eventId?: string;
  id?: string;
  type?: string;
  [key: string]: any;
}

export class QRScanService {
  /**
   * Process a scanned QR code and handle attendance logging
   */
  static async processQRScan(
    qrData: string,
    userId: string,
    deviceInfo?: {
      platform?: string;
      version?: string;
      model?: string;
    },
    locationInfo?: {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    }
  ): Promise<QRScanResult> {
    try {
      // Parse QR code data
      const parsedData = this.parseQRData(qrData);

      // Handle deferred validation for offline QR token entry
      if (parsedData.requiresValidation && parsedData.qrToken) {
        // This is an offline token entry - need to look it up
        if (NetworkStatusMonitor.isOnline()) {
          // Try to resolve the token now
          const resolvedData = await this.lookupQRCodeByToken(parsedData.qrToken);
          if (resolvedData) {
            const resolved = JSON.parse(resolvedData);
            parsedData.eventId = resolved.eventId || resolved.id;
            parsedData.userId = resolved.userId;
            delete parsedData.requiresValidation;
            delete parsedData.qrToken;
          } else {
            return {
              success: false,
              error: 'Invalid QR token',
              message: 'The entered QR token does not match any active QR code. Please verify and try again.'
            };
          }
        } else {
          // Still offline - cannot proceed without resolving token
          // Scanned QR codes work offline because they contain event ID + participant ID
          // Manual token entry requires online to resolve token to event/participant info
          return {
            success: false,
            error: 'QR token validation required',
            message: 'QR token lookup requires an internet connection to verify the token and participant registration. Scanning the QR code directly with the camera works offline and doesn\'t require manual entry.'
          };
        }
      }

      const eventId = parsedData.eventId || parsedData.id;

      if (!eventId) {
        return {
          success: false,
          error: 'Invalid QR code format',
          message: 'QR code does not contain valid event information'
        };
      }

      // Determine which user to check registration for
      // If QR code contains userId, check that participant's registration
      // Otherwise, check the scanning user's registration
      const participantUserId = parsedData.userId || userId;

      // If offline, queue for validation and sync
      if (!NetworkStatusMonitor.isOnline()) {
        // Create preliminary attendance log (will be validated on sync)
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        const attendanceLog = {
          id: `local-${Date.now()}-${Math.random()}`,
          event_id: eventId,
          user_id: participantUserId,
          check_in_method: 'qr_scan',
          check_in_time: now,
          check_in_date: today,
          is_validated: false, // Will be validated on sync
          validation_notes: 'Pending server validation',
          // Store QR validation data for sync
          _qrValidationData: {
            qrData: qrData,
            qrToken: parsedData.qrToken || parsedData.token,
            scannerUserId: userId,
            deviceInfo,
            locationInfo
          }
        };

        // Save to local database
        await LocalDatabaseService.saveAttendanceLog(attendanceLog);

        // Queue for sync with QR validation data
        await SyncQueueService.enqueue(
          DataType.ATTENDANCE_RECORD,
          'create',
          'attendance_logs',
          attendanceLog,
          SyncPriority.CRITICAL // Critical priority for attendance
        );

        // Try to get event from cache for response
        const cachedEvent = await LocalDatabaseService.getEventById(eventId);

        return {
          success: true,
          event: cachedEvent || { id: eventId, title: 'Event' },
          attendanceLog: attendanceLog,
          message: 'Check-in saved offline. Will be validated and synced when online.'
        };
      }

      // Online: Validate QR code and proceed with full verification
      const validationResult = await this.validateQRCode(qrData, parsedData, eventId, participantUserId);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error || 'QR code validation failed',
          message: validationResult.message || 'This QR code could not be validated. Please try again.'
        };
      }

      // Verify event exists and is published
      const event = await this.verifyEvent(eventId);
      if (!event) {
        return {
          success: false,
          error: 'Event not found',
          message: 'This QR code is not associated with a valid published event'
        };
      }

      const isRegistered = await this.checkEventRegistration(eventId, participantUserId);
      if (!isRegistered) {
        return {
          success: false,
          error: 'Not registered',
          message: 'You must be registered for this event before checking in'
        };
      }

      // Check if participant has already checked in
      console.log('processQRScan: Checking for existing attendance for event:', eventId, 'user:', participantUserId);
      const existingAttendance = await this.checkExistingAttendance(eventId, participantUserId);
      console.log('processQRScan: Existing attendance result:', existingAttendance);

      if (existingAttendance) {
        // Get the date of the existing check-in for better error message
        let checkInDateStr = 'today';
        if (existingAttendance.check_in_date) {
          checkInDateStr = typeof existingAttendance.check_in_date === 'string'
            ? existingAttendance.check_in_date.split('T')[0]
            : new Date(existingAttendance.check_in_date).toISOString().split('T')[0];
        } else if (existingAttendance.check_in_time) {
          const date = new Date(existingAttendance.check_in_time);
          checkInDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        console.log('processQRScan: Comparing check-in date', checkInDateStr, 'with today', todayStr);

        // Only show "already checked in" if it's from today
        if (checkInDateStr === todayStr) {
          console.log('processQRScan: Check-in is from today, blocking new check-in');
          return {
            success: true,
            event: event,
            attendanceLog: existingAttendance,
            message: 'You have already checked in to this event today'
          };
        } else {
          console.log('processQRScan: Check-in is from a different day (', checkInDateStr, 'vs', todayStr, '), allowing new check-in');
          // If check-in is from a different day, allow new check-in
        }
      } else {
        console.log('processQRScan: No existing attendance found, proceeding with check-in');
      }

      // Validate check-in timing
      const timingValidation = this.validateCheckInTiming(event);
      if (!timingValidation.valid) {
        return {
          success: false,
          error: 'Check-in not allowed',
          message: timingValidation.message
        };
      }

      // Create attendance log for the participant
      const attendanceLog = await this.createAttendanceLog(
        eventId,
        participantUserId,
        deviceInfo,
        locationInfo
      );

      if (!attendanceLog) {
        return {
          success: false,
          error: 'Check-in failed',
          message: 'Failed to record your attendance. Please try again.'
        };
      }

      // Online: Update event participant count
      await this.updateEventParticipantCount(eventId);

      // Log QR scan for analytics (track who scanned and for whom)
      await this.logQRScan(eventId, userId, qrData, deviceInfo, locationInfo, participantUserId);

      // Save to local database for offline access
      await LocalDatabaseService.saveAttendanceLog(attendanceLog);

      return {
        success: true,
        event: event,
        attendanceLog: attendanceLog,
        message: 'Successfully checked in to the event!'
      };

    } catch (error) {
      console.error('Error processing QR scan:', error);
      return {
        success: false,
        error: 'Processing failed',
        message: 'An error occurred while processing the QR code. Please try again.'
      };
    }
  }

  /**
   * Look up QR code by token (8-character ID) and return its qr_data
   * SECURITY: 
   * - 8-character tokens: Allowed offline but validated on sync (deferred validation)
   * - Event IDs: Require online verification to prevent abuse
   */
  static async lookupQRCodeByToken(qrToken: string, requireOnlineForEventId: boolean = true): Promise<string | null> {
    try {
      // Remove any dashes or spaces from the token
      const cleanToken = qrToken.replace(/[-\s]/g, '').toUpperCase();

      // If it's not 8 characters, check if it might be an event ID (UUID format)
      // Event IDs are typically 36 characters with dashes, or 32 without
      if (cleanToken.length !== 8) {
        // Check if it looks like a UUID (32 hex chars or 36 with dashes)
        const uuidPattern = /^[0-9A-F]{8}-?[0-9A-F]{4}-?[0-9A-F]{4}-?[0-9A-F]{4}-?[0-9A-F]{12}$/i;
        if (uuidPattern.test(qrToken)) {
          // SECURITY: Event ID entry requires online verification to prevent abuse
          // This ensures we can verify event exists, is published, and user has proper permissions
          if (requireOnlineForEventId && !NetworkStatusMonitor.isOnline()) {
            console.warn('Event ID entry requires online connection for security verification');
            return null; // Will show appropriate error message
          }

          // If online, verify the event exists and is published before allowing
          if (NetworkStatusMonitor.isOnline()) {
            const event = await this.verifyEvent(qrToken);
            if (!event) {
              console.warn('Event ID not found or not published:', qrToken);
              return null;
            }
          }

          // It's an event ID - return it as QR data
          // Note: This still requires participant registration check in processQRScan
          return JSON.stringify({ eventId: qrToken, id: qrToken });
        }
        return null;
      }

      // Try to fetch from server if online
      if (NetworkStatusMonitor.isOnline()) {
        try {
          const { data, error } = await supabase
            .from('qr_codes')
            .select('qr_data, is_active')
            .eq('qr_token', cleanToken)
            .eq('is_active', true)
            .single();

          if (error || !data) {
            // If not found online, return null
            return null;
          }

          // Return the qr_data as a JSON string
          return JSON.stringify(data.qr_data);
        } catch (error) {
          console.error('Error looking up QR code by token:', error);
          // Fall through to offline handling
        }
      }

      // Offline: Allow 8-character token entry but mark for deferred validation
      // The token will be validated when syncing to server
      // This allows organizers to manually enter participant QR tokens when offline
      // Security: Validation happens on server sync - invalid tokens will be rejected
      console.warn('QR token lookup offline - will validate on sync. Token:', cleanToken);

      // Return a placeholder QR data structure that will be validated on sync
      // The sync process will look up the token and verify it's valid
      return JSON.stringify({
        eventId: null, // Will be resolved on sync
        qrToken: cleanToken, // Store token for lookup on sync
        requiresValidation: true // Flag for deferred validation
      });
    } catch (error) {
      console.error('Error looking up QR code by token:', error);
      return null;
    }
  }

  /**
   * Parse QR code data from various formats
   */
  private static parseQRData(qrData: string): QRScanData {
    try {
      // Try to parse as JSON first
      return JSON.parse(qrData);
    } catch {
      // If not JSON, treat as simple event ID
      return { eventId: qrData, id: qrData };
    }
  }

  /**
   * Validate QR code against server (security check)
   * This prevents fake QR codes from being used
   * Called during sync to validate queued offline scans
   */
  static async validateQRCode(
    qrData: string,
    parsedData: QRScanData,
    eventId: string,
    participantUserId: string
  ): Promise<{ valid: boolean; error?: string; message?: string }> {
    try {
      const qrToken = parsedData.qrToken || parsedData.token;

      // If QR code has a token, validate it exists and is active
      if (qrToken) {
        const { data: qrCodeRecord, error: qrError } = await supabase
          .from('qr_codes')
          .select('id, is_active, expires_at, max_scans, scan_count, event_id, owner_id')
          .eq('qr_token', qrToken)
          .eq('is_active', true)
          .single();

        if (qrError || !qrCodeRecord) {
          return {
            valid: false,
            error: 'Invalid QR code',
            message: 'This QR code is not valid or has been deactivated. Please use a valid QR code.'
          };
        }

        // Check if QR code has expired
        if (qrCodeRecord.expires_at) {
          const expiresAt = new Date(qrCodeRecord.expires_at);
          if (new Date() > expiresAt) {
            return {
              valid: false,
              error: 'QR code expired',
              message: 'This QR code has expired. Please request a new QR code.'
            };
          }
        }

        // Check if QR code has reached max scans
        if (qrCodeRecord.max_scans && qrCodeRecord.scan_count >= qrCodeRecord.max_scans) {
          return {
            valid: false,
            error: 'QR code limit reached',
            message: 'This QR code has reached its maximum scan limit.'
          };
        }

        // Verify QR code matches the event
        if (qrCodeRecord.event_id && qrCodeRecord.event_id !== eventId) {
          return {
            valid: false,
            error: 'QR code mismatch',
            message: 'This QR code does not match the event. Please use the correct QR code for this event.'
          };
        }

        // Verify QR code owner matches participant (if specified)
        if (qrCodeRecord.owner_id && qrCodeRecord.owner_id !== participantUserId) {
          return {
            valid: false,
            error: 'QR code owner mismatch',
            message: 'This QR code does not belong to the participant. Please use the correct QR code.'
          };
        }
      } else {
        // If no token, try to validate by matching qr_data
        // This is less secure but handles legacy QR codes
        const { data: matchingQR, error: matchError } = await supabase
          .from('qr_codes')
          .select('id, is_active, event_id, owner_id')
          .eq('is_active', true)
          .contains('qr_data', { eventId, userId: participantUserId })
          .limit(1);

        if (matchError || !matchingQR || matchingQR.length === 0) {
          console.warn('QR code not found in database - may be fake or legacy QR code');
          // For legacy QR codes without tokens, we'll allow but log a warning
          // In production, you might want to be stricter
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating QR code:', error);
      return {
        valid: false,
        error: 'Validation error',
        message: 'An error occurred while validating the QR code. Please try again.'
      };
    }
  }

  /**
   * Verify that the event exists and is published
   * Supports offline fallback to local database
   */
  private static async verifyEvent(eventId: string) {
    // Try server first if online
    if (NetworkStatusMonitor.isOnline()) {
      try {
        const { data: event, error } = await supabase
          .from('events')
          .select(`
            id,
            title,
            description,
            start_date,
            end_date,
            start_time,
            end_time,
            venue,
            max_participants,
            current_participants,
            status,
            check_in_before_minutes,
            check_in_during_minutes
          `)
          .eq('id', eventId)
          .eq('status', 'published')
          .single();

        if (error || !event) {
          // Fall through to local database
        } else {
          // Save to local database for offline access
          await LocalDatabaseService.saveEvent(event);
          return event;
        }
      } catch (error) {
        console.error('Error verifying event on server:', error);
        // Fall through to local database
      }
    }

    // Fallback to local database
    try {
      const cachedEvent = await LocalDatabaseService.getEventById(eventId);
      if (cachedEvent && cachedEvent.status === 'published') {
        return cachedEvent;
      }
    } catch (error) {
      console.error('Error checking local database for event:', error);
    }

    return null;
  }

  /**
   * Check if user is registered for the event
   * Supports offline fallback to local database
   */
  private static async checkEventRegistration(eventId: string, userId: string): Promise<boolean> {
    // Try server first if online
    if (NetworkStatusMonitor.isOnline()) {
      try {
        const { data, error } = await supabase
          .from('event_registrations')
          .select('id, status, event_id, user_id')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .eq('status', 'registered');

        if (error) {
          // Fall through to offline check
        } else if (data && data.length > 0) {
          return true;
        }
      } catch (error) {
        console.error('Error checking registration on server:', error);
        // Fall through to offline check
      }
    }

    // SECURITY: When offline, we cannot reliably verify registration
    // This is a security risk - registration checks require server verification
    // For now, we'll be strict: require online for registration verification
    // In the future, we could cache registrations locally
    if (!NetworkStatusMonitor.isOnline()) {
      console.warn('Registration verification requires online connection for security');
      // Return false to be safe - this will prevent unauthorized check-ins
      return false;
    }

    return false;
  }

  /**
   * Check if user has already checked in today (for multi-day event support)
   */
  private static async checkExistingAttendance(eventId: string, userId: string) {
    // Get current date in YYYY-MM-DD format using local timezone
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();
    const today = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

    console.log('[CHECK-IN] ===== Checking for existing attendance =====');
    console.log('[CHECK-IN] Today (local):', today);
    console.log('[CHECK-IN] Event ID:', eventId);
    console.log('[CHECK-IN] User ID:', userId);

    // Get all attendance records for this user and event
    // Try to include check_in_date - if column doesn't exist, Supabase will return null for that field
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id, check_in_time, check_in_method, is_validated, check_in_date')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .order('check_in_time', { ascending: false });

    if (error) {
      console.log('[CHECK-IN] ERROR fetching records:', JSON.stringify(error, null, 2));
      return null;
    }

    if (!data || data.length === 0) {
      console.log('[CHECK-IN] No records found - allowing check-in');
      return null;
    }

    console.log('[CHECK-IN] Found', data.length, 'record(s)');

    // Check each record to see if any are from today
    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      let recordDate: string | null = null;

      console.log(`[CHECK-IN] --- Record ${i + 1} ---`);
      console.log('[CHECK-IN] check_in_date:', record.check_in_date);
      console.log('[CHECK-IN] check_in_time:', record.check_in_time);

      // Use check_in_date if available (after migration), otherwise use date from check_in_time
      if (record.check_in_date !== null && record.check_in_date !== undefined) {
        // check_in_date is already a DATE string in YYYY-MM-DD format from database
        if (typeof record.check_in_date === 'string') {
          recordDate = record.check_in_date.split('T')[0];
        } else {
          // If it's a Date object, convert to string
          const d = new Date(record.check_in_date);
          recordDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        console.log('[CHECK-IN] Using check_in_date ->', recordDate);
      } else if (record.check_in_time) {
        // For check_in_time, extract the date in local timezone to match "today"
        const checkInDate = new Date(record.check_in_time);
        const checkInYear = checkInDate.getFullYear();
        const checkInMonth = checkInDate.getMonth() + 1;
        const checkInDay = checkInDate.getDate();
        recordDate = `${checkInYear}-${String(checkInMonth).padStart(2, '0')}-${String(checkInDay).padStart(2, '0')}`;
        console.log('[CHECK-IN] Using check_in_time -> local date:', recordDate);
      } else {
        console.log('[CHECK-IN] Record has no date, skipping');
        continue; // Skip records without a date
      }

      console.log('[CHECK-IN] Comparing:', recordDate, '===', today, '?', recordDate === today);

      // If this record is from today, return it
      if (recordDate === today) {
        console.log('[CHECK-IN] ✓ MATCH! Found check-in from today - BLOCKING new check-in');
        return record;
      } else {
        console.log('[CHECK-IN] ✗ NO MATCH - Record is from different day, continuing...');
      }
    }

    console.log('[CHECK-IN] ===== No check-in found for today - ALLOWING new check-in =====');
    // No check-in found for today
    return null;
  }

  /**
   * Validate if check-in is allowed at current time (supports multi-day events with daily check-in windows)
   */
  private static validateCheckInTiming(event: any): { valid: boolean; message?: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventStartDate = new Date(event.start_date);
    const eventEndDate = new Date(event.end_date);
    const eventEndTime = new Date(`${event.end_date}T${event.end_time}`);

    // Check if event has already ended
    if (now > eventEndTime) {
      return {
        valid: false,
        message: 'This event has already ended'
      };
    }

    // Check if current date is within event date range
    if (today < eventStartDate || today > eventEndDate) {
      return {
        valid: false,
        message: `Check-in is only available during the event dates (${event.start_date} to ${event.end_date})`
      };
    }

    // Get check-in window settings (default to 60 minutes before, 30 minutes during)
    const checkInBeforeMinutes = event.check_in_before_minutes ?? 60;
    const checkInDuringMinutes = event.check_in_during_minutes ?? 30;

    // For multi-day events, calculate daily check-in window based on start_time
    // Use the current date with the event's start_time
    const currentDayStartTime = new Date(`${today.toISOString().split('T')[0]}T${event.start_time}`);

    // Calculate daily check-in window
    const dailyCheckInStart = new Date(currentDayStartTime.getTime() - (checkInBeforeMinutes * 60 * 1000));
    const dailyCheckInEnd = new Date(currentDayStartTime.getTime() + (checkInDuringMinutes * 60 * 1000));

    // Check if current time is within today's check-in window
    if (now < dailyCheckInStart) {
      const startTimeStr = dailyCheckInStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return {
        valid: false,
        message: `Check-in opens at ${startTimeStr} today`
      };
    }

    if (now > dailyCheckInEnd) {
      const endTimeStr = dailyCheckInEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return {
        valid: false,
        message: `Check-in window closed at ${endTimeStr} today`
      };
    }

    return { valid: true };
  }

  /**
   * Create attendance log entry (with check_in_date for multi-day event support)
   */
  private static async createAttendanceLog(
    eventId: string,
    userId: string,
    deviceInfo?: any,
    locationInfo?: any
  ) {
    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Build attendance data - include check_in_date if column exists (after migration)
    const attendanceData: any = {
      event_id: eventId,
      user_id: userId,
      check_in_method: 'qr_scan',
      check_in_time: now,
      check_in_date: today,
      is_validated: true, // Auto-validate QR scans
      validation_notes: 'QR code scan validated automatically'
    };

    // If online, try to create on server
    if (NetworkStatusMonitor.isOnline()) {
      try {
        const { data, error } = await supabase
          .from('attendance_logs')
          .insert(attendanceData)
          .select(`
            id,
            check_in_time,
            check_in_date,
            check_in_method,
            is_validated
          `)
          .single();

        if (error) {
          // If error is due to unique constraint (before migration), provide helpful message
          if (error.code === '23505') {
            console.error('Check-in failed: Unique constraint violation. Migration may not have been run.');
          }
          // Return local version for offline queue
          return {
            id: `local-${Date.now()}-${Math.random()}`,
            ...attendanceData,
          };
        }

        return data;
      } catch (error) {
        console.error('Error creating attendance log on server:', error);
        // Return local version for offline queue
        return {
          id: `local-${Date.now()}-${Math.random()}`,
          ...attendanceData,
        };
      }
    }

    // Offline: return local version
    return {
      id: `local-${Date.now()}-${Math.random()}`,
      ...attendanceData,
    };
  }

  /**
   * Update event participant count
   */
  private static async updateEventParticipantCount(eventId: string) {
    // Get current count
    const { count } = await supabase
      .from('attendance_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('is_validated', true);

    // Update event with new count
    await supabase
      .from('events')
      .update({ current_participants: count || 0 })
      .eq('id', eventId);
  }

  /**
   * Log QR scan for analytics (if qr_code_scans table exists)
   */
  private static async logQRScan(
    eventId: string,
    scannerUserId: string,
    qrData: string,
    deviceInfo?: any,
    locationInfo?: any,
    participantUserId?: string
  ) {
    try {
      const scanData = {
        qr_code_id: null, // We don't have QR code IDs in this simple implementation
        scanned_by: scannerUserId,
        scan_method: 'qr_scan',
        scan_context: 'event_checkin',
        device_info: deviceInfo ? JSON.stringify(deviceInfo) : null,
        location_data: locationInfo ? JSON.stringify(locationInfo) : null,
        scan_result: JSON.stringify({
          eventId,
          success: true,
          participantUserId: participantUserId || scannerUserId
        }),
        is_valid: true,
        metadata: JSON.stringify({
          qrData: qrData.substring(0, 100),
          participantUserId: participantUserId || scannerUserId,
          scannerUserId: scannerUserId
        }) // Truncate for storage
      };

      await supabase
        .from('qr_code_scans')
        .insert(scanData);
    } catch (error) {
      // Don't fail the main process if analytics logging fails
    }
  }

  /**
   * Get user's attendance history
   */
  static async getUserAttendanceHistory(userId: string) {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        id,
        check_in_time,
        check_in_method,
        is_validated,
        events (
          id,
          title,
          start_date,
          end_date,
          venue
        )
      `)
      .eq('user_id', userId)
      .order('check_in_time', { ascending: false });

    if (error) {
      return [];
    }

    return data || [];
  }

  /**
   * Get event attendance statistics
   */
  static async getEventAttendanceStats(eventId: string) {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        id,
        check_in_time,
        check_in_method,
        users (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('event_id', eventId)
      .eq('is_validated', true)
      .order('check_in_time', { ascending: false });

    if (error) {
      return [];
    }

    return data || [];
  }
}
