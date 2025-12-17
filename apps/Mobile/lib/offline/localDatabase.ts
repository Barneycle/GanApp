import * as SQLite from 'expo-sqlite';
import { DataType } from './conflictResolution';

/**
 * Local Database Service
 * SQLite database for offline data storage
 */
export class LocalDatabaseService {
  private static db: SQLite.SQLiteDatabase | null = null;
  private static initialized = false;

  /**
   * Initialize local database
   */
  static async initialize(): Promise<void> {
    if (this.initialized && this.db) {
      return;
    }

    try {
      this.db = await SQLite.openDatabaseAsync('ganapp_offline.db');
      await this.createTables();
      this.initialized = true;
      console.log('Local database initialized');
    } catch (error) {
      console.error('Error initializing local database:', error);
      throw error;
    }
  }

  /**
   * Create necessary tables
   */
  private static async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Events table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        venue TEXT NOT NULL,
        status TEXT NOT NULL,
        banner_url TEXT,
        max_participants INTEGER,
        current_participants INTEGER,
        created_by TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced_at TEXT,
        data_type TEXT DEFAULT 'event_metadata'
      );
    `);

    // Attendance logs table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        check_in_time TEXT,
        check_in_date TEXT,
        check_in_method TEXT,
        is_validated INTEGER DEFAULT 0,
        synced_at TEXT,
        data_type TEXT DEFAULT 'attendance_record',
        FOREIGN KEY (event_id) REFERENCES events(id)
      );
    `);

    // Survey responses table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id TEXT PRIMARY KEY,
        survey_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        responses TEXT NOT NULL,
        created_at TEXT,
        synced_at TEXT,
        data_type TEXT DEFAULT 'evaluation_survey',
        UNIQUE(survey_id, user_id)
      );
    `);

    // Event registrations table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        registration_date TEXT,
        created_at TEXT,
        synced_at TEXT,
        data_type TEXT DEFAULT 'event_registration',
        UNIQUE(event_id, user_id)
      );
    `);

    // Certificates table (read-only cache)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS certificates (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        certificate_url TEXT,
        issued_at TEXT,
        synced_at TEXT,
        data_type TEXT DEFAULT 'certificate'
      );
    `);

    // Photo uploads table (for offline photo queue)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS photo_uploads (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        local_file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        uploaded_at TEXT,
        synced_at TEXT,
        data_type TEXT DEFAULT 'image_upload',
        status TEXT DEFAULT 'pending'
      );
    `);

    // Event chat settings table (per participant)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS event_chat_settings (
        event_id TEXT NOT NULL,
        participant_id TEXT NOT NULL,
        is_chat_open INTEGER DEFAULT 1,
        synced_at TEXT,
        PRIMARY KEY (event_id, participant_id)
      );
    `);

    // Event messages table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS event_messages (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        participant_id TEXT NOT NULL,
        organizer_id TEXT NOT NULL,
        message TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        read_at TEXT,
        created_at TEXT,
        synced_at TEXT,
        data_type TEXT DEFAULT 'event_message'
      );
    `);

    // Create indexes
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
      CREATE INDEX IF NOT EXISTS idx_attendance_event_user ON attendance_logs(event_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_user ON survey_responses(survey_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_registrations_event_user ON event_registrations(event_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_photo_uploads_event_user ON photo_uploads(event_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_photo_uploads_status ON photo_uploads(status);
      CREATE INDEX IF NOT EXISTS idx_event_messages_event ON event_messages(event_id);
      CREATE INDEX IF NOT EXISTS idx_event_messages_participant ON event_messages(participant_id);
      CREATE INDEX IF NOT EXISTS idx_event_messages_created_at ON event_messages(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_event_chat_settings_event_participant ON event_chat_settings(event_id, participant_id);
    `);
  }

  /**
   * Save event to local database
   */
  static async saveEvent(event: any): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync(
      `INSERT OR REPLACE INTO events (
        id, title, description, start_date, end_date, start_time, end_time,
        venue, status, banner_url, max_participants, current_participants,
        created_by, created_at, updated_at, synced_at, data_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.title,
        event.description || null,
        event.start_date,
        event.end_date,
        event.start_time,
        event.end_time,
        event.venue,
        event.status,
        event.banner_url || null,
        event.max_participants || null,
        event.current_participants || 0,
        event.created_by || null,
        event.created_at || new Date().toISOString(),
        event.updated_at || new Date().toISOString(),
        new Date().toISOString(),
        'event_metadata',
      ]
    );
  }

  /**
   * Get events from local database
   */
  static async getEvents(status?: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }

    let query = 'SELECT * FROM events';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY start_date ASC';

    const result = await this.db!.getAllAsync(query, params);
    return result.map((row: any) => this.parseEvent(row));
  }

  /**
   * Get event by ID
   */
  static async getEventById(id: string): Promise<any | null> {
    if (!this.db) {
      await this.initialize();
    }

    const results = await this.db!.getAllAsync(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );

    return results.length > 0 ? this.parseEvent(results[0]) : null;
  }

  /**
   * Save attendance log
   */
  static async saveAttendanceLog(attendance: any): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync(
      `INSERT OR REPLACE INTO attendance_logs (
        id, event_id, user_id, check_in_time, check_in_date,
        check_in_method, is_validated, synced_at, data_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attendance.id || `local-${Date.now()}-${Math.random()}`,
        attendance.event_id,
        attendance.user_id,
        attendance.check_in_time || new Date().toISOString(),
        attendance.check_in_date || new Date().toISOString().split('T')[0],
        attendance.check_in_method || 'qr_scan',
        attendance.is_validated ? 1 : 0,
        attendance.synced_at || null,
        'attendance_record',
      ]
    );
  }

  /**
   * Get attendance logs
   */
  static async getAttendanceLogs(eventId?: string, userId?: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }

    let query = 'SELECT * FROM attendance_logs WHERE 1=1';
    const params: any[] = [];

    if (eventId) {
      query += ' AND event_id = ?';
      params.push(eventId);
    }

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY check_in_time DESC';

    const result = await this.db!.getAllAsync(query, params);
    return result.map((row: any) => this.parseAttendanceLog(row));
  }

  /**
   * Save survey response
   */
  static async saveSurveyResponse(response: any): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync(
      `INSERT OR REPLACE INTO survey_responses (
        id, survey_id, user_id, responses, created_at, synced_at, data_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        response.id || `local-${Date.now()}-${Math.random()}`,
        response.survey_id,
        response.user_id,
        JSON.stringify(response.responses),
        response.created_at || new Date().toISOString(),
        response.synced_at || null,
        'evaluation_survey',
      ]
    );
  }

  /**
   * Get survey response
   */
  static async getSurveyResponse(surveyId: string, userId: string): Promise<any | null> {
    if (!this.db) {
      await this.initialize();
    }

    const results = await this.db!.getAllAsync(
      'SELECT * FROM survey_responses WHERE survey_id = ? AND user_id = ?',
      [surveyId, userId]
    );

    if (results.length === 0) {
      return null;
    }

    const result = results[0] as any;
    return {
      ...result,
      responses: JSON.parse(result.responses as string),
    };
  }

  /**
   * Mark record as synced
   */
  static async markSynced(table: string, id: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync(
      `UPDATE ${table} SET synced_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  }

  /**
   * Get unsynced records
   */
  static async getUnsyncedRecords(table: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }

    const result = await this.db!.getAllAsync(
      `SELECT * FROM ${table} WHERE synced_at IS NULL`
    );

    return result;
  }

  /**
   * Save photo upload metadata
   */
  static async savePhotoUpload(photo: {
    id?: string;
    event_id: string;
    user_id: string;
    local_file_path: string;
    file_name: string;
    file_size?: number;
    uploaded_at?: string;
    status?: string;
  }): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync(
      `INSERT OR REPLACE INTO photo_uploads (
        id, event_id, user_id, local_file_path, file_name,
        file_size, uploaded_at, synced_at, data_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        photo.id || `photo-${Date.now()}-${Math.random()}`,
        photo.event_id,
        photo.user_id,
        photo.local_file_path,
        photo.file_name,
        photo.file_size || null,
        photo.uploaded_at || new Date().toISOString(),
        null, // synced_at
        'image_upload',
        photo.status || 'pending',
      ]
    );
  }

  /**
   * Get pending photo uploads
   */
  static async getPendingPhotoUploads(eventId?: string, userId?: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }

    let query = 'SELECT * FROM photo_uploads WHERE status = ?';
    const params: any[] = ['pending'];

    if (eventId) {
      query += ' AND event_id = ?';
      params.push(eventId);
    }

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY uploaded_at ASC';

    const results = await this.db!.getAllAsync(query, params) as any[];
    return results;
  }

  /**
   * Mark photo as synced
   */
  static async markPhotoSynced(photoId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync(
      'UPDATE photo_uploads SET synced_at = ?, status = ? WHERE id = ?',
      [new Date().toISOString(), 'synced', photoId]
    );
  }

  /**
   * Save event registration
   */
  static async saveEventRegistration(registration: {
    id: string;
    event_id: string;
    user_id: string;
    status: string;
    registration_date?: string;
    created_at?: string;
    updated_at?: string;
  }): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync(
      `INSERT OR REPLACE INTO event_registrations (
        id, event_id, user_id, status, registration_date, created_at, synced_at, data_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        registration.id,
        registration.event_id,
        registration.user_id,
        registration.status,
        registration.registration_date || new Date().toISOString().split('T')[0],
        registration.created_at || new Date().toISOString(),
        registration.synced_at || null,
        'event_registration',
      ]
    );
  }

  /**
   * Get event registrations
   */
  static async getEventRegistrations(eventId?: string, userId?: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }

    let query = 'SELECT * FROM event_registrations WHERE 1=1';
    const params: any[] = [];

    if (eventId) {
      query += ' AND event_id = ?';
      params.push(eventId);
    }

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY created_at DESC';

    const results = await this.db!.getAllAsync(query, params) as any[];
    return results;
  }

  /**
   * Save certificate (read-only cache)
   */
  static async saveCertificate(certificate: {
    id: string;
    event_id: string;
    user_id: string;
    certificate_url: string;
    issued_at: string;
  }): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync(
      `INSERT OR REPLACE INTO certificates (
        id, event_id, user_id, certificate_url, issued_at, synced_at, data_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        certificate.id,
        certificate.event_id,
        certificate.user_id,
        certificate.certificate_url,
        certificate.issued_at,
        new Date().toISOString(),
        'certificate',
      ]
    );
  }

  /**
   * Get certificates for user
   */
  static async getCertificates(userId: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }

    const results = await this.db!.getAllAsync(
      'SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_at DESC',
      [userId]
    ) as any[];

    return results;
  }

  /**
   * Save chat settings
   */
  static async saveChatSettings(settings: {
    event_id: string;
    participant_id?: string;
    is_chat_open: boolean;
  }): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    // If participant_id is provided, use it; otherwise use a placeholder for backward compatibility
    const participantId = settings.participant_id || 'default';

    await this.db!.runAsync(
      `INSERT OR REPLACE INTO event_chat_settings (
        event_id, participant_id, is_chat_open, synced_at
      ) VALUES (?, ?, ?, ?)`,
      [
        settings.event_id,
        participantId,
        settings.is_chat_open ? 1 : 0,
        new Date().toISOString(),
      ]
    );
  }

  /**
   * Get chat settings for a specific participant
   */
  static async getChatSettings(eventId: string, participantId?: string): Promise<any | null> {
    if (!this.db) {
      await this.initialize();
    }

    // If participantId is provided, query with it; otherwise use default for backward compatibility
    const pid = participantId || 'default';
    const results = await this.db!.getAllAsync(
      'SELECT * FROM event_chat_settings WHERE event_id = ? AND participant_id = ?',
      [eventId, pid]
    ) as any[];

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    return {
      event_id: result.event_id,
      participant_id: result.participant_id,
      is_chat_open: result.is_chat_open === 1,
      synced_at: result.synced_at,
    };
  }

  /**
   * Save event message
   */
  static async saveEventMessage(message: {
    id: string;
    event_id: string;
    participant_id: string;
    organizer_id: string;
    message: string;
    sender_id: string;
    read_at?: string | null;
    created_at: string;
    synced_at?: string;
  }): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    await this.db!.runAsync(
      `INSERT OR REPLACE INTO event_messages (
        id, event_id, participant_id, organizer_id, message,
        sender_id, read_at, created_at, synced_at, data_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.event_id,
        message.participant_id,
        message.organizer_id,
        message.message,
        message.sender_id,
        message.read_at || null,
        message.created_at,
        message.synced_at || null,
        'event_message',
      ]
    );
  }

  /**
   * Get event messages
   */
  static async getEventMessages(eventId: string, userId: string): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }

    // Get event to determine if user is organizer or participant
    const event = await this.getEventById(eventId);
    if (!event) {
      return [];
    }

    const isOrganizer = event.created_by === userId;
    const query = isOrganizer
      ? 'SELECT * FROM event_messages WHERE event_id = ? AND organizer_id = ? ORDER BY created_at ASC'
      : 'SELECT * FROM event_messages WHERE event_id = ? AND participant_id = ? ORDER BY created_at ASC';

    const results = await this.db!.getAllAsync(query, [eventId, userId]) as any[];
    return results.map((row: any) => ({
      id: row.id,
      event_id: row.event_id,
      participant_id: row.participant_id,
      organizer_id: row.organizer_id,
      message: row.message,
      sender_id: row.sender_id,
      read_at: row.read_at,
      created_at: row.created_at,
    }));
  }

  /**
   * Delete event messages from local database
   */
  static async deleteEventMessages(
    eventId: string,
    organizerId: string,
    participantId?: string
  ): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    if (participantId) {
      // Delete messages for specific participant thread
      await this.db!.runAsync(
        'DELETE FROM event_messages WHERE event_id = ? AND organizer_id = ? AND participant_id = ?',
        [eventId, organizerId, participantId]
      );
    } else {
      // Delete all messages for the organizer in this event
      await this.db!.runAsync(
        'DELETE FROM event_messages WHERE event_id = ? AND organizer_id = ?',
        [eventId, organizerId]
      );
    }
  }

  /**
   * Parse event from database row
   */
  private static parseEvent(row: any): any {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      start_date: row.start_date,
      end_date: row.end_date,
      start_time: row.start_time,
      end_time: row.end_time,
      venue: row.venue,
      status: row.status,
      banner_url: row.banner_url,
      max_participants: row.max_participants,
      current_participants: row.current_participants,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      synced_at: row.synced_at,
    };
  }

  /**
   * Parse attendance log from database row
   */
  private static parseAttendanceLog(row: any): any {
    return {
      id: row.id,
      event_id: row.event_id,
      user_id: row.user_id,
      check_in_time: row.check_in_time,
      check_in_date: row.check_in_date,
      check_in_method: row.check_in_method,
      is_validated: row.is_validated === 1,
      synced_at: row.synced_at,
    };
  }

  /**
   * Close database connection
   */
  static async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.initialized = false;
    }
  }
}
