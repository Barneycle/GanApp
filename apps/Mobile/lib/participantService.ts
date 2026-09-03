import { supabase } from './supabase';

export interface ParticipantInfo {
  id: string;
  first_name: string;
  middle_initial?: string;
  last_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  registration_status: string;
  registration_date: string;
  attendance_status: 'checked_in' | 'not_checked_in';
  check_in_time?: string;
  check_in_method?: string;
}

export class ParticipantService {
  /**
   * Get participant information by user ID and event ID
   */
  static async getParticipantInfo(userId: string, eventId: string): Promise<ParticipantInfo | null> {
    try {
      console.log('Fetching participant info for userId:', userId, 'eventId:', eventId);
      
      // Try to get user info from RPC function first
      const { data: userData, error: userError } = await supabase.rpc('get_user_profile', { user_id: userId });
      
      console.log('RPC user data:', userData, 'Error:', userError);
      
      let user = userData;
      
      // If RPC doesn't work, try public users table as fallback
      if (userError || !userData) {
        const { data: usersTableData, error: tableError } = await supabase
          .from('users')
          .select('id, email, first_name, middle_initial, last_name, phone, avatar_url, role')
          .eq('id', userId)
          .single();
        
        console.log('Users table data:', usersTableData, 'Error:', tableError);
        if (usersTableData) {
          user = usersTableData;
        }
      }
      
      // Get registration information
      const { data: registration, error: regError } = await supabase
        .from('event_registrations')
        .select('id, status, created_at')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

      console.log('Registration data:', registration, 'Error:', regError);

      // Get attendance information (check for today's check-in for multi-day event support)
      const today = new Date().toISOString().split('T')[0];
      const { data: attendance, error: attError } = await supabase
        .from('attendance_logs')
        .select('id, check_in_time, check_in_date, check_in_method')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .eq('check_in_date', today) // Get today's check-in
        .eq('is_validated', true)
        .single();

      console.log('Attendance data:', attendance, 'Error:', attError);

      // If no user found, return null
      if (!user) {
        console.log('Could not fetch user data');
        return null;
      }

      // Parse the user data (could be JSON from RPC or object from table)
      const userInfo = typeof user === 'string' ? JSON.parse(user) : user;

      // Extract middle_initial from userInfo
      // Note: RPC function may need to be updated to include middle_initial
      // See schemas/patches/update_get_user_profile_middle_initial.sql
      const middleInitial = userInfo.middle_initial || '';

      // Build participant info with real user data
      const participantInfo: ParticipantInfo = {
        id: userInfo.id || userId,
        first_name: userInfo.first_name || 'Unknown',
        middle_initial: middleInitial,
        last_name: userInfo.last_name || '',
        email: userInfo.email || '',
        phone: userInfo.phone || '',
        avatar_url: userInfo.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        role: userInfo.role || 'participant',
        registration_status: registration?.status || 'not_registered',
        registration_date: registration?.created_at || '',
        attendance_status: attendance ? 'checked_in' : 'not_checked_in',
        check_in_time: attendance?.check_in_time,
        check_in_method: attendance?.check_in_method
      };

      console.log('Created participant info:', participantInfo);
      return participantInfo;
    } catch (error) {
      console.error('Error fetching participant info:', error);
      return null;
    }
  }

  /**
   * Get participant information by QR code data
   */
  static async getParticipantInfoByQR(qrData: string, eventId: string): Promise<ParticipantInfo | null> {
    try {
      // Parse QR code data to extract user ID
      let userId: string | null = null;
      
      try {
        const parsedData = JSON.parse(qrData);
        userId = parsedData.userId || parsedData.id;
      } catch {
        // If not JSON, treat as simple user ID
        userId = qrData;
      }

      if (!userId) {
        return null;
      }

      return await this.getParticipantInfo(userId, eventId);
    } catch (error) {
      console.error('Error parsing QR data for participant info:', error);
      return null;
    }
  }
}
