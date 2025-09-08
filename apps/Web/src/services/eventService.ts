import { supabase } from '../lib/supabaseClient';

export interface Event {
  id: string;
  title: string;
  rationale: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  status: 'draft' | 'published' | 'cancelled';
  is_featured?: boolean;
  max_participants?: number;
  current_participants?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  sponsors?: any[];
  guest_speakers?: any[];
  banner_url?: string;
  materials_url?: string;
  sponsor_logos_url?: string;
  speaker_photos_url?: string;
  event_programmes_url?: string;
  certificate_templates_url?: string;
  event_kits_url?: string;
}

export interface EventWithDetails extends Event {
  creator: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
  };
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  registration_date: string;
  status: 'registered' | 'cancelled' | 'attended';
  created_at: string;
}

export class EventService {
  static async getAllEvents(): Promise<{ events?: Event[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      // Calculate current participants for each event
      const eventsWithParticipants = await Promise.all(
        data.map(async (event) => {
          const { count } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'registered'); // Only count 'registered' status
          
          return {
            ...event,
            current_participants: count || 0
          };
        })
      );

      return { events: eventsWithParticipants };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getEventById(id: string): Promise<{ event?: Event; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        return { error: 'Event not found' };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async createEvent(eventData: Partial<Event>): Promise<{ event?: Event; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateEvent(id: string, updates: Partial<Event>): Promise<{ event?: Event; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async deleteEvent(id: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getEventsByCreator(creatorId: string): Promise<{ events?: Event[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', creatorId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { events: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getPublishedEvents(): Promise<{ events?: Event[]; error?: string }> {
    try {
      console.log('🔄 getPublishedEvents - Starting fresh query...');
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ getPublishedEvents - Database error:', error);
        // If table doesn't exist, return empty array instead of error
        if (error.code === 'PGRST205') {
          return { events: [] };
        }
        
        return { error: error.message };
      }

      console.log('📊 getPublishedEvents - Raw events from DB:', data);

      // Always calculate count from actual registrations to avoid stale data
      const eventsWithParticipants = await Promise.all(
        data.map(async (event) => {
          console.log(`📊 Counting registrations for event: ${event.id}`);
          
          // First, let's see what registrations exist for this event
          const { data: allRegistrations, error: allError } = await supabase
            .from('event_registrations')
            .select('*')
            .eq('event_id', event.id);
          
          if (allError) {
            console.error(`❌ Error getting all registrations for event ${event.id}:`, allError);
          } else {
            console.log(`📊 Event ${event.id} - All registrations:`, allRegistrations);
            // Show the status of each registration
            allRegistrations.forEach((reg, index) => {
              console.log(`📊 Registration ${index + 1}: user_id=${reg.user_id}, status=${reg.status}`);
            });
          }
          
          // Now count only registered ones
          const { count, error } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'registered'); // Only count 'registered' status
          
          if (error) {
            console.error(`❌ Error counting registrations for event ${event.id}:`, error);
          }
          
          console.log(`📊 Event ${event.id} - Found ${count} registered participants`);
          
          return {
            ...event,
            current_participants: count || 0
          };
        })
      );

      console.log('📊 getPublishedEvents - Raw database data:', data);
      console.log('📊 getPublishedEvents - Processed events:', eventsWithParticipants);

      return { events: eventsWithParticipants };
    } catch (error) {
      // If it's a table not found error, return empty array
      if (error.message && error.message.includes('table') && error.message.includes('not found')) {
        return { events: [] };
      }
      
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateEventStatus(id: string, status: string): Promise<{ event?: Event; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getFeaturedEvent(): Promise<{ event?: Event; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_featured', true)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async setFeaturedEvent(id: string): Promise<{ event?: Event; error?: string }> {
    try {
      // First, unfeature all other events
      await supabase
        .from('events')
        .update({ is_featured: false })
        .neq('id', id);

      // Then set the selected event as featured
      const { data, error } = await supabase
        .from('events')
        .update({ is_featured: true })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async unfeatureEvent(id: string): Promise<{ event?: Event; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ is_featured: false })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  // Event Registration Methods
  static async registerForEvent(eventId: string, userId: string): Promise<{ registration?: EventRegistration; error?: string }> {
    try {
      console.log('🔄 Registering for event:', eventId, 'user:', userId);
      
      // Check if user is already registered (active registration)
      const existingRegistration = await this.getUserRegistration(eventId, userId);
      if (existingRegistration.registration) {
        console.log('❌ User already has active registration');
        return { error: 'You are already registered for this event' };
      }

      // Check if THIS USER has a cancelled registration that we can reactivate
      const { data: cancelledRegistration, error: cancelledError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)  // Only check for THIS specific user
        .eq('status', 'cancelled')
        .maybeSingle();

      if (cancelledError) {
        console.error('Error checking for cancelled registration:', cancelledError);
      }
      
      if (cancelledRegistration) {
        console.log('🔄 Found cancelled registration for this user:', cancelledRegistration.user_id);
      } else {
        console.log('🆕 No cancelled registration found for this user, will create new one');
      }

      // Check if event exists and is published
      const eventResult = await this.getEventById(eventId);
      if (eventResult.error) {
        return { error: eventResult.error };
      }

      if (!eventResult.event) {
        return { error: 'Event not found' };
      }

      if (eventResult.event.status !== 'published') {
        return { error: 'This event is not available for registration' };
      }

      // Check if event has reached max participants
      if (eventResult.event.max_participants && eventResult.event.current_participants >= eventResult.event.max_participants) {
        return { error: 'This event has reached maximum capacity' };
      }

      // Create or reactivate registration
      let registrationData;
      let registrationError;

      if (cancelledRegistration) {
        // Reactivate cancelled registration
        console.log('🔄 Reactivating cancelled registration');
        console.log('📊 Cancelled registration ID:', cancelledRegistration.id);
        const { data, error } = await supabase
          .from('event_registrations')
          .update({ status: 'registered' })
          .eq('id', cancelledRegistration.id)
          .select()
          .single();
        
        console.log('📊 Reactivation result:', { data, error });
        registrationData = data;
        registrationError = error;
      } else {
        // Create new registration
        console.log('🆕 Creating new registration');
        console.log('📊 New registration data:', { event_id: eventId, user_id: userId, status: 'registered' });
        const { data, error } = await supabase
          .from('event_registrations')
          .insert([{
            event_id: eventId,
            user_id: userId,
            status: 'registered'
          }])
          .select()
          .single();
        
        console.log('📊 New registration result:', { data, error });
        registrationData = data;
        registrationError = error;
      }

      if (registrationError) {
        console.error('❌ Registration error:', registrationError);
        return { error: registrationError.message };
      }

      console.log('✅ Registration created/updated:', registrationData);
      console.log('📊 Registration status:', registrationData.status);
      console.log('📊 Registration user_id:', registrationData.user_id);

      // Update event participant count - use database count + 1
      const currentCount = eventResult.event.current_participants || 0;
      const newCount = currentCount + 1;
      console.log('📊 Registration - Current count:', currentCount);
      console.log('📊 Registration - Adding 1, new count:', newCount);
      console.log('📊 Is this a reactivation?', !!cancelledRegistration);
      
      console.log('📊 Event ID:', eventId);
      console.log('📊 Event data before update:', eventResult.event);
      console.log('📊 Registration data:', registrationData);
      console.log('📊 Is this a reactivation?', !!cancelledRegistration);
      
      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          current_participants: newCount
        })
        .eq('id', eventId);

      if (updateError) {
        console.error('❌ Error updating participant count:', updateError);
        console.error('❌ Update error details:', updateError);
        // Don't fail the registration if count update fails
      } else {
        console.log('✅ Participant count updated successfully');
        
        // Verify the update worked
        const { data: updatedEvent, error: verifyError } = await supabase
          .from('events')
          .select('current_participants')
          .eq('id', eventId)
          .single();
          
        if (verifyError) {
          console.error('❌ Error verifying update:', verifyError);
        } else {
          console.log('✅ Verified participant count:', updatedEvent.current_participants);
          
          // If verification shows the update didn't work, try again
          if (updatedEvent.current_participants !== newCount) {
            console.log('🔄 Count mismatch detected, retrying update...');
            const { error: retryError } = await supabase
              .from('events')
              .update({ 
                current_participants: newCount
              })
              .eq('id', eventId);
              
            if (retryError) {
              console.error('❌ Retry failed:', retryError);
            } else {
              console.log('✅ Retry successful');
            }
          }
        }
      }

      return { registration: registrationData };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async unregisterFromEvent(eventId: string, userId: string): Promise<{ error?: string }> {
    try {
      console.log('🔄 Unregistering from event:', eventId, 'user:', userId);
      
      // Get current registration
      const registrationResult = await this.getUserRegistration(eventId, userId);
      if (registrationResult.error) {
        console.error('❌ Error getting registration:', registrationResult.error);
        return { error: registrationResult.error };
      }

      if (!registrationResult.registration) {
        console.error('❌ No registration found');
        return { error: 'You are not registered for this event' };
      }

      console.log('✅ Found registration:', registrationResult.registration);

      // Get current event data to get the participant count
      const eventData = await this.getEventById(eventId);
      if (eventData.error) {
        console.error('❌ Error getting event data:', eventData.error);
        return { error: eventData.error };
      }

      // Update event participant count - use database count - 1
      const currentCount = eventData.event.current_participants || 0;
      const newCount = Math.max(currentCount - 1, 0);
      console.log('📊 Unregistration - Current count:', currentCount);
      console.log('📊 Unregistration - Subtracting 1, new count:', newCount);
      
      const { data: updateData, error: updateError } = await supabase
        .from('events')
        .update({ 
          current_participants: newCount
        })
        .eq('id', eventId)
        .select('current_participants');

      if (updateError) {
        console.error('❌ Error updating participant count:', updateError);
        console.error('❌ Update error details:', updateError);
        // Don't fail the cancellation if count update fails
      } else {
        console.log('✅ Participant count updated successfully');
        console.log('📊 Update result data:', updateData);
        console.log('📊 Expected count:', newCount);
        console.log('📊 Actual updated count:', updateData?.[0]?.current_participants);
      }

      // Update registration status AFTER updating the count
      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'cancelled' })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error updating registration status:', error);
        return { error: error.message };
      }

      console.log('✅ Registration status updated to cancelled');

      return {};
    } catch (error) {
      console.error('❌ Unexpected error in cancelEventRegistration:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getUserRegistration(eventId: string, userId: string): Promise<{ registration?: EventRegistration; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'registered')  // Only get active registrations
        .maybeSingle();

      if (error) {
        return { error: error.message };
      }

      if (!data) {
        // No active registration found
        return {};
      }

      return { registration: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getUserRegistrations(userId: string): Promise<{ registrations?: EventRegistration[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          *,
          events (
            id,
            title,
            start_date,
            end_date,
            venue,
            status
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'registered')
        .order('registration_date', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { registrations: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getEventParticipants(eventId: string): Promise<{ participants?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          *,
          users (
            id,
            email,
            first_name,
            last_name,
            user_type,
            organization
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'registered')
        .order('registration_date', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { participants: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}
