import { supabase } from './supabase';

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
      
      const eventId = parsedData.eventId || parsedData.id;
      
      if (!eventId) {
        return {
          success: false,
          error: 'Invalid QR code format',
          message: 'QR code does not contain valid event information'
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

      // Determine which user to check registration for
      // If QR code contains userId, check that participant's registration
      // Otherwise, check the scanning user's registration
      const participantUserId = parsedData.userId || userId;
      
      const isRegistered = await this.checkEventRegistration(eventId, participantUserId);
      
      if (!isRegistered) {
        return {
          success: false,
          error: 'Not registered',
          message: 'You must be registered for this event before checking in'
        };
      }

      // Check if participant has already checked in
      const existingAttendance = await this.checkExistingAttendance(eventId, participantUserId);
      
      if (existingAttendance) {
        return {
          success: true,
          event: event,
          attendanceLog: existingAttendance,
          message: 'You have already checked in to this event'
        };
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

      // Update event participant count
      await this.updateEventParticipantCount(eventId);

      // Log QR scan for analytics (track who scanned and for whom)
      await this.logQRScan(eventId, userId, qrData, deviceInfo, locationInfo, participantUserId);

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
   * Verify that the event exists and is published
   */
  private static async verifyEvent(eventId: string) {
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
        status
      `)
      .eq('id', eventId)
      .eq('status', 'published')
      .single();

    if (error || !event) {
      return null;
    }

    return event;
  }

  /**
   * Check if user is registered for the event
   */
  private static async checkEventRegistration(eventId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('event_registrations')
      .select('id, status, event_id, user_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('status', 'registered');

    if (error) {
      return false;
    }
    
    const isRegistered = data && data.length > 0;
    
    return isRegistered;
  }

  /**
   * Check if user has already checked in
   */
  private static async checkExistingAttendance(eventId: string, userId: string) {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        id,
        check_in_time,
        check_in_method,
        is_validated
      `)
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Validate if check-in is allowed at current time
   */
  private static validateCheckInTiming(event: any): { valid: boolean; message?: string } {
    const now = new Date();
    const eventDate = new Date(event.start_date);
    const eventStartTime = new Date(`${event.start_date}T${event.start_time}`);
    const eventEndTime = new Date(`${event.end_date}T${event.end_time}`);

    // Check if event has already ended
    if (now > eventEndTime) {
      return {
        valid: false,
        message: 'This event has already ended'
      };
    }

    // Check if event hasn't started yet (with buffer)
    const checkInBuffer = 60; // 60 minutes before event starts
    const checkInStartTime = new Date(eventStartTime.getTime() - (checkInBuffer * 60 * 1000));
    
    if (now < checkInStartTime) {
      return {
        valid: false,
        message: `Check-in opens ${checkInBuffer} minutes before the event starts`
      };
    }

    return { valid: true };
  }

  /**
   * Create attendance log entry
   */
  private static async createAttendanceLog(
    eventId: string,
    userId: string,
    deviceInfo?: any,
    locationInfo?: any
  ) {
    const attendanceData = {
      event_id: eventId,
      user_id: userId,
      check_in_method: 'qr_scan',
      is_validated: true, // Auto-validate QR scans
      validation_notes: 'QR code scan validated automatically'
    };

    const { data, error } = await supabase
      .from('attendance_logs')
      .insert(attendanceData)
      .select(`
        id,
        check_in_time,
        check_in_method,
        is_validated
      `)
      .single();

    if (error) {
      return null;
    }

    return data;
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
