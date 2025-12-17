import { supabase } from '../lib/supabaseClient';
import { logActivity, createActivityDetails } from '../utils/activityLogger';
import { CacheService } from './cacheService';
import { LoggerService } from './loggerService';

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
  banner_url?: string;
  materials_url?: string;
  event_programmes_url?: string;
  certificate_templates_url?: string;
  event_kits_url?: string;
  registration_open?: boolean;
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
      // Check cache first
      const cacheKey = CacheService.keys.event(id);
      const cached = await CacheService.get<Event>(cacheKey);
      if (cached) {
        return { event: cached };
      }

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

      // Cache the result
      await CacheService.set(cacheKey, data, CacheService.TTL.MEDIUM);

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

      // Log activity
      if (data && eventData.created_by) {
        logActivity(
          eventData.created_by,
          'create',
          'event',
          {
            resourceId: data.id,
            resourceName: data.title || 'Untitled Event',
            details: { event_id: data.id, title: data.title }
          }
        ).catch(err => LoggerService.serviceError('EventService', 'Failed to log event creation', err));
      }

      // Invalidate cache
      await CacheService.deletePattern('events:*');

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateEvent(id: string, updates: Partial<Event>): Promise<{ event?: Event; error?: string }> {
    try {
      // Get old event data for activity logging
      const { data: oldEvent } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      // Log activity
      if (data && oldEvent) {
        const changedFields = Object.keys(updates).filter(key => updates[key as keyof Event] !== oldEvent[key as keyof Event]);
        logActivity(
          data.created_by || oldEvent.created_by,
          'update',
          'event',
          {
            resourceId: data.id,
            resourceName: data.title || 'Untitled Event',
            details: createActivityDetails(oldEvent, data, changedFields)
          }
        ).catch(err => LoggerService.serviceError('EventService', 'Failed to log event update', err));
      }

      // Invalidate cache
      await CacheService.delete(CacheService.keys.event(id));
      await CacheService.deletePattern('events:*');

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async deleteEvent(id: string): Promise<{ error?: string }> {
    try {
      // Get event data before deletion for activity logging
      const { data: oldEvent } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        return { error: error.message };
      }

      // Log activity
      if (oldEvent) {
        logActivity(
          oldEvent.created_by,
          'delete',
          'event',
          {
            resourceId: oldEvent.id,
            resourceName: oldEvent.title || 'Untitled Event',
            details: createActivityDetails(oldEvent, null)
          }
        ).catch(err => LoggerService.serviceError('EventService', 'Failed to log event deletion', err));
      }

      // Invalidate cache
      await CacheService.delete(CacheService.keys.event(id));
      await CacheService.deletePattern('events:*');

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getEventsByCreator(creatorId: string): Promise<{ events?: Event[]; error?: string }> {
    try {
      // Check cache first
      const cacheKey = CacheService.keys.eventList('organizer', creatorId);
      const cached = await CacheService.get<Event[]>(cacheKey);
      if (cached) {
        return { events: cached };
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', creatorId)
        .order('created_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      // Cache the result
      await CacheService.set(cacheKey, data, CacheService.TTL.SHORT);

      return { events: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async getPublishedEvents(): Promise<{ events?: Event[]; error?: string }> {
    try {
      // Check cache first
      const cacheKey = CacheService.keys.events('published');
      const cached = await CacheService.get<Event[]>(cacheKey);
      if (cached) {
        return { events: cached };
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      if (error) {
        // If table doesn't exist, return empty array instead of error
        if (error.code === 'PGRST205') {
          return { events: [] };
        }

        return { error: error.message };
      }


      // Always calculate count from actual registrations to avoid stale data
      const eventsWithParticipants = await Promise.all(
        data.map(async (event) => {

          // First, let's see what registrations exist for this event
          const { data: allRegistrations, error: allError } = await supabase
            .from('event_registrations')
            .select('*')
            .eq('event_id', event.id);

          if (allError) {
          } else {
            // Show the status of each registration
            allRegistrations.forEach((reg, index) => {
            });
          }

          // Now count only registered ones
          const { count, error } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'registered'); // Only count 'registered' status

          if (error) {
          }


          return {
            ...event,
            current_participants: count || 0
          };
        })
      );

      // Cache the result
      await CacheService.set(cacheKey, eventsWithParticipants, CacheService.TTL.SHORT);

      return { events: eventsWithParticipants };
    } catch (error) {
      // If it's a table not found error, return empty array
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('table') && errorMessage.includes('not found')) {
        return { events: [] };
      }

      return { error: 'An unexpected error occurred' };
    }
  }

  static async updateEventStatus(id: string, status: string): Promise<{ event?: Event; error?: string }> {
    try {
      // Get event details before update
      const { data: oldEvent } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      // Send notifications based on status change
      if (data && oldEvent) {
        if (status === 'published' && oldEvent.status !== 'published') {
          // Notify organizer when event is published
          const { NotificationService } = await import('./notificationService');
          NotificationService.createNotification(
            data.created_by,
            'Event Published',
            `Your event "${data.title}" has been published and is now visible to participants.`,
            'success',
            {
              action_url: `/events?eventId=${id}`,
              action_text: 'View Event',
              priority: 'normal'
            }
          ).catch(err => LoggerService.serviceError('EventService', 'Failed to send event published notification', err));
        } else if (status === 'cancelled' && oldEvent.status !== 'cancelled') {
          // Notify all registered participants when event is cancelled
          const { data: registrations } = await supabase
            .from('event_registrations')
            .select('user_id')
            .eq('event_id', id)
            .eq('status', 'registered');

          if (registrations && registrations.length > 0) {
            const { AdminService } = await import('./adminService');
            const userIds = registrations.map(r => r.user_id);
            AdminService.sendBulkNotifications(
              userIds,
              'Event Cancelled',
              `The event "${data.title}" has been cancelled. We apologize for any inconvenience.`,
              'warning',
              {
                action_url: `/events?eventId=${id}`,
                action_text: 'View Details',
                priority: 'high'
              }
            ).catch(err => LoggerService.serviceError('EventService', 'Failed to send event cancelled notifications', err));
          }
        }
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

      // Send notifications based on status change
      if (data && oldEvent) {
        if (status === 'published' && oldEvent.status !== 'published') {
          // Notify organizer when event is published
          const { NotificationService } = await import('./notificationService');
          NotificationService.createNotification(
            data.created_by,
            'Event Published',
            `Your event "${data.title}" has been published and is now visible to participants.`,
            'success',
            {
              action_url: `/events?eventId=${id}`,
              action_text: 'View Event',
              priority: 'normal'
            }
          ).catch(err => LoggerService.serviceError('EventService', 'Failed to send event published notification', err));
        } else if (status === 'cancelled' && oldEvent.status !== 'cancelled') {
          // Notify all registered participants when event is cancelled
          const { data: registrations } = await supabase
            .from('event_registrations')
            .select('user_id')
            .eq('event_id', id)
            .eq('status', 'registered');

          if (registrations && registrations.length > 0) {
            const { AdminService } = await import('./adminService');
            const userIds = registrations.map(r => r.user_id);
            AdminService.sendBulkNotifications(
              userIds,
              'Event Cancelled',
              `The event "${data.title}" has been cancelled. We apologize for any inconvenience.`,
              'warning',
              {
                action_url: `/events?eventId=${id}`,
                action_text: 'View Details',
                priority: 'high'
              }
            ).catch(err => LoggerService.serviceError('EventService', 'Failed to send event cancelled notifications', err));
          }
        }
      }

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  static async setFeaturedEvent(id: string): Promise<{ event?: Event; error?: string }> {
    try {
      // First, unfeature all other events
      const { error: unfeatureError } = await supabase
        .from('events')
        .update({ is_featured: false })
        .neq('id', id);

      if (unfeatureError) {
        LoggerService.serviceError('EventService', 'Error unfeaturing other events', unfeatureError);
        return { error: `Failed to unfeature other events: ${unfeatureError.message}` };
      }

      // Then set the selected event as featured
      const { data, error } = await supabase
        .from('events')
        .update({ is_featured: true })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        LoggerService.serviceError('EventService', 'Error featuring event', error);
        return { error: error.message };
      }

      if (!data) {
        return { error: 'Event not found' };
      }

      // Verify the update succeeded
      if (!data.is_featured) {
        return { error: 'Failed to set event as featured' };
      }

      // Verify only one event is featured
      const { data: featuredEvents, error: verifyError } = await supabase
        .from('events')
        .select('id, title, is_featured')
        .eq('is_featured', true);

      if (verifyError) {
        LoggerService.serviceWarn('EventService', 'Could not verify featured events', { error: verifyError });
      } else if (featuredEvents && featuredEvents.length > 1) {
        LoggerService.serviceWarn('EventService', 'Multiple events are featured', { featuredEvents });
        // Try to fix it by unfeaturing all except the current one
        const otherFeaturedIds = featuredEvents
          .filter(e => e.id !== id)
          .map(e => e.id);

        if (otherFeaturedIds.length > 0) {
          await supabase
            .from('events')
            .update({ is_featured: false })
            .in('id', otherFeaturedIds);
        }
      }

      // Invalidate cache to ensure fresh data is loaded
      await CacheService.deletePattern('events:*');
      await CacheService.delete(CacheService.keys.event(id));

      return { event: data };
    } catch (error: any) {
      LoggerService.serviceError('EventService', 'Unexpected error in setFeaturedEvent', error);
      return { error: error?.message || 'An unexpected error occurred' };
    }
  }

  static async toggleEventRegistration(eventId: string, registrationOpen: boolean): Promise<{ event?: Event; error?: string }> {
    try {
      // Get event details before update
      const { data: oldEvent } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      const { data, error } = await supabase
        .from('events')
        .update({ registration_open: registrationOpen })
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      // Send notification to registered participants if registration was closed
      if (data && oldEvent && !registrationOpen && oldEvent.registration_open) {
        const { data: registrations } = await supabase
          .from('event_registrations')
          .select('user_id')
          .eq('event_id', eventId)
          .eq('status', 'registered');

        if (registrations && registrations.length > 0) {
          const { AdminService } = await import('./adminService');
          const userIds = registrations.map(r => r.user_id);
          AdminService.sendBulkNotifications(
            userIds,
            'Event Registration Closed',
            `Registration for "${(data as Event).title}" has been closed by the organizer.`,
            'info',
            {
              action_url: `/events?eventId=${eventId}`,
              action_text: 'View Event',
              priority: 'normal'
            }
          ).catch(err => LoggerService.serviceError('EventService', 'Failed to send registration closed notifications', err));
        }
      }

      // Invalidate cache to ensure fresh data is loaded
      await CacheService.deletePattern('events:*');
      await CacheService.delete(CacheService.keys.event(eventId));

      return { event: data as Event };
    } catch (error: any) {
      return { error: error?.message || 'Failed to toggle event registration status' };
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

      // Invalidate cache to ensure fresh data is loaded
      await CacheService.deletePattern('events:*');
      await CacheService.delete(CacheService.keys.event(id));

      return { event: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  // Event Registration Methods
  static async registerForEvent(eventId: string, userId: string): Promise<{ registration?: EventRegistration; error?: string }> {
    try {

      // Check if user is already registered (active registration)
      const existingRegistration = await this.getUserRegistration(eventId, userId);
      if (existingRegistration.registration) {
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
      }

      if (cancelledRegistration) {
      } else {
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

      // Check if registration is open for this event
      if (eventResult.event.registration_open === false) {
        return { error: 'Registration closed: Event organizer has closed registration' };
      }

      // Check if event is past (ended)
      const now = new Date();
      const endDateTime = new Date(`${eventResult.event.end_date}T${eventResult.event.end_time || '23:59:59'}`);
      if (endDateTime < now) {
        return { error: 'Registration closed: Event has ended' };
      }

      // Check if event has reached max participants
      if (eventResult.event.max_participants && eventResult.event.current_participants !== undefined && eventResult.event.current_participants >= eventResult.event.max_participants) {
        return { error: 'This event has reached maximum capacity' };
      }

      // Create or reactivate registration
      let registrationData;
      let registrationError;

      if (cancelledRegistration) {
        // Reactivate cancelled registration
        const { data, error } = await supabase
          .from('event_registrations')
          .update({ status: 'registered' })
          .eq('id', cancelledRegistration.id)
          .select()
          .single();

        registrationData = data;
        registrationError = error;
      } else {
        // Create new registration
        const { data, error } = await supabase
          .from('event_registrations')
          .insert([{
            event_id: eventId,
            user_id: userId,
            status: 'registered'
          }])
          .select()
          .single();

        registrationData = data;
        registrationError = error;
      }

      if (registrationError) {
        return { error: registrationError.message };
      }

      // Log activity
      logActivity(
        userId,
        'create',
        'registration',
        {
          resourceId: registrationData.id,
          resourceName: eventResult.event.title || 'Event Registration',
          details: { registration_id: registrationData.id, event_id: eventId, event_title: eventResult.event.title }
        }
      ).catch(err => LoggerService.serviceError('EventService', 'Failed to log event registration', err));

      // Send notification to user
      const { NotificationService } = await import('./notificationService');
      NotificationService.createNotification(
        userId,
        'Registration Confirmed',
        `You have successfully registered for "${eventResult.event.title}". We look forward to seeing you at the event!`,
        'success',
        {
          action_url: `/events?eventId=${eventId}`,
          action_text: 'View Event Details',
          priority: 'normal'
        }
      ).catch(err => LoggerService.serviceError('EventService', 'Failed to send registration notification', err));

      // Update event participant count - use database count + 1
      const currentCount = eventResult.event.current_participants || 0;
      const newCount = currentCount + 1;


      const { error: updateError } = await supabase
        .from('events')
        .update({
          current_participants: newCount
        })
        .eq('id', eventId);

      if (updateError) {
        // Don't fail the registration if count update fails
      } else {

        // Verify the update worked
        const { data: updatedEvent, error: verifyError } = await supabase
          .from('events')
          .select('current_participants')
          .eq('id', eventId)
          .single();

        if (verifyError) {
        } else {

          // If verification shows the update didn't work, try again
          if (updatedEvent.current_participants !== newCount) {
            const { error: retryError } = await supabase
              .from('events')
              .update({
                current_participants: newCount
              })
              .eq('id', eventId);

            if (retryError) {
            } else {
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

      // Get current registration
      const registrationResult = await this.getUserRegistration(eventId, userId);
      if (registrationResult.error) {
        return { error: registrationResult.error };
      }

      if (!registrationResult.registration) {
        return { error: 'You are not registered for this event' };
      }


      // Get current event data to get the participant count
      const eventData = await this.getEventById(eventId);
      if (eventData.error || !eventData.event) {
        return { error: eventData.error || 'Event not found' };
      }

      // Update event participant count - use database count - 1
      const currentCount = eventData.event.current_participants || 0;
      const newCount = Math.max(currentCount - 1, 0);

      const { data: updateData, error: updateError } = await supabase
        .from('events')
        .update({
          current_participants: newCount
        })
        .eq('id', eventId)
        .select('current_participants');

      if (updateError) {
        // Don't fail the cancellation if count update fails
      } else {
      }

      // Update registration status AFTER updating the count
      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'cancelled' })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        return { error: error.message };
      }


      return {};
    } catch (error) {
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
          events (*)
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
      // Use RPC function to get participants with user data from auth.users
      const { data, error } = await supabase.rpc('get_event_participants', {
        event_uuid: eventId
      });

      if (error) {
        // Fallback: Get registrations and fetch user data separately
        const { data: registrations, error: regError } = await supabase
          .from('event_registrations')
          .select('*')
          .eq('event_id', eventId)
          .eq('status', 'registered')
          .order('registration_date', { ascending: false });

        if (regError) {
          return { error: regError.message };
        }

        // Fetch user data for each registration using get_user_profile
        const participantsWithUsers = await Promise.all(
          (registrations || []).map(async (reg) => {
            const { data: userData } = await supabase.rpc('get_user_profile', {
              user_id: reg.user_id
            });
            return {
              ...reg,
              users: userData || null
            };
          })
        );

        return { participants: participantsWithUsers };
      }

      return { participants: data || [] };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Request cancellation of an event (organizers only)
   */
  static async requestEventCancellation(
    eventId: string,
    userId: string,
    requestReason: string,
    cancellationDate: string,
    additionalNotes?: string
  ): Promise<{ request?: any; error?: string }> {
    try {
      // Verify user is the event creator (organizer)
      const eventResult = await this.getEventById(eventId);
      if (eventResult.error || !eventResult.event) {
        return { error: 'Event not found' };
      }

      if (eventResult.event.created_by !== userId) {
        return { error: 'Only the event organizer can request cancellation' };
      }

      // Check if event is already cancelled
      if (eventResult.event.status === 'cancelled') {
        return { error: 'Event is already cancelled' };
      }

      // Check if there's already a pending request
      const { data: existingRequests, error: checkError } = await supabase
        .from('event_cancellation_requests')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('requested_by', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        return { error: checkError.message };
      }

      if (existingRequests) {
        return { error: 'You already have a pending cancellation request for this event' };
      }

      // Create cancellation request
      const { data, error } = await supabase
        .from('event_cancellation_requests')
        .insert({
          event_id: eventId,
          requested_by: userId,
          request_reason: requestReason,
          cancellation_date: cancellationDate,
          additional_notes: additionalNotes || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      return { request: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get all archived events (for organizers and participants)
   */
  static async getArchivedEvents(): Promise<{ events?: Event[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('archived_events')
        .select('*')
        .order('archived_at', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      // Transform archived events to match Event interface
      const events: Event[] = (data || []).map((archived) => ({
        id: archived.original_event_id || archived.id,
        title: archived.title,
        rationale: archived.rationale || archived.description || '',
        start_date: archived.start_date,
        end_date: archived.end_date,
        start_time: archived.start_time,
        end_time: archived.end_time,
        venue: archived.venue,
        status: (archived.status === 'cancelled' ? 'cancelled' : 'cancelled') as 'draft' | 'published' | 'cancelled',
        is_featured: archived.is_featured || false,
        max_participants: archived.max_participants,
        current_participants: archived.final_participant_count || 0,
        created_by: archived.created_by,
        created_at: archived.original_created_at,
        updated_at: archived.original_updated_at,
        banner_url: archived.banner_url,
        materials_url: archived.materials_url,
        event_programmes_url: archived.programme_url,
        certificate_templates_url: undefined,
        event_kits_url: archived.event_kits_url,
      }));

      return { events };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Check if user has checked in to an event today (for multi-day event support)
   */
  static async checkUserCheckInStatus(eventId: string, userId: string): Promise<{ isCheckedIn: boolean; isValidated?: boolean; error?: string }> {
    try {
      // Get current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // First, check for any check-in (validated or not) for today
      const { data: todayCheckIn, error: todayError } = await supabase
        .from('attendance_logs')
        .select('id, check_in_time, check_in_date, is_validated')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('check_in_date', today)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If no check-in today, check for most recent check-in (for multi-day events)
      let checkInData = todayCheckIn;
      if (!todayCheckIn && todayError?.code !== 'PGRST116') {
        const { data: recentCheckIn } = await supabase
          .from('attendance_logs')
          .select('id, check_in_time, check_in_date, is_validated')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .order('check_in_time', { ascending: false })
          .limit(1)
          .maybeSingle();
        checkInData = recentCheckIn;
      }

      if (!checkInData) {
        return { isCheckedIn: false, isValidated: false };
      }

      return {
        isCheckedIn: !!checkInData?.check_in_time,
        isValidated: checkInData?.is_validated || false
      };
    } catch (error) {
      return { isCheckedIn: false, isValidated: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Check if user has completed survey/evaluation for an event
   */
  static async checkUserSurveyCompletion(eventId: string, userId: string): Promise<{ isCompleted: boolean; error?: string }> {
    try {
      // Check survey_responses with join to surveys table
      const { data: surveyResponses, error: surveyError } = await supabase
        .from('survey_responses')
        .select(`
          id,
          surveys!inner(event_id)
        `)
        .eq('user_id', userId)
        .eq('surveys.event_id', eventId);

      if (surveyResponses && surveyResponses.length > 0) {
        return { isCompleted: true };
      }

      // Check evaluation_responses with join to evaluations table
      const { data: evaluationResponses, error: evalError } = await supabase
        .from('evaluation_responses')
        .select(`
          id,
          evaluations!inner(event_id)
        `)
        .eq('user_id', userId)
        .eq('evaluations.event_id', eventId);

      if (evaluationResponses && evaluationResponses.length > 0) {
        return { isCompleted: true };
      }

      return { isCompleted: false };
    } catch (error) {
      return { isCompleted: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get all check-ins for an event (for organizers)
   */
  static async getEventCheckIns(eventId: string): Promise<{ checkIns?: any[]; error?: string }> {
    try {
      const { data: logs, error } = await supabase
        .from('attendance_logs')
        .select(`
          id,
          event_id,
          user_id,
          check_in_time,
          check_in_date,
          check_in_method,
          is_validated,
          validated_by,
          validation_notes
        `)
        .eq('event_id', eventId)
        .order('check_in_time', { ascending: false });

      if (error) {
        return { error: error.message };
      }

      // Fetch user data for each check-in
      const checkInsWithUsers = await Promise.all(
        (logs || []).map(async (log: any) => {
          let userData = null;
          try {
            const { data } = await supabase.rpc('get_user_profile', {
              user_id: log.user_id
            });
            userData = data;
          } catch (err) {
            LoggerService.serviceError('EventService', 'Error fetching user profile', err);
          }

          return {
            id: log.id,
            event_id: log.event_id,
            user_id: log.user_id,
            check_in_time: log.check_in_time,
            check_in_date: log.check_in_date,
            check_in_method: log.check_in_method,
            is_validated: log.is_validated,
            validated_by: log.validated_by,
            validation_notes: log.validation_notes,
            user: userData || null,
            participant_name: userData
              ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email
              : 'Unknown User',
            participant_email: userData?.email || 'N/A'
          };
        })
      );

      return { checkIns: checkInsWithUsers };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Add a manual check-in (for organizers)
   */
  static async addManualCheckIn(
    eventId: string,
    userId: string,
    organizerId: string,
    checkInDate?: string
  ): Promise<{ checkIn?: any; error?: string }> {
    try {
      // Verify organizer is the event creator
      const eventResult = await this.getEventById(eventId);
      if (eventResult.error || !eventResult.event) {
        return { error: 'Event not found' };
      }

      if (eventResult.event.created_by !== organizerId) {
        return { error: 'Only the event organizer can add manual check-ins' };
      }

      // Use provided date or current date
      const date = checkInDate || new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('attendance_logs')
        .insert({
          event_id: eventId,
          user_id: userId,
          check_in_time: now,
          check_in_date: date,
          check_in_method: 'manual',
          is_validated: true,
          validated_by: organizerId,
          validation_notes: 'Manual check-in by organizer'
        })
        .select(`
          id,
          event_id,
          user_id,
          check_in_time,
          check_in_date,
          check_in_method,
          is_validated,
          validated_by,
          validation_notes
        `)
        .single();

      if (error) {
        // Check if it's a unique constraint violation (already checked in)
        if (error.code === '23505') {
          return { error: 'User has already checked in for this date' };
        }
        return { error: error.message };
      }

      // Log activity
      logActivity(
        organizerId,
        'create',
        'check_in',
        {
          resourceId: data.id,
          resourceName: 'Manual Check-In',
          details: { event_id: eventId, user_id: userId, method: 'manual' }
        }
      ).catch(err => LoggerService.serviceError('EventService', 'Failed to log check-in', err));

      return { checkIn: data };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Validate or unvalidate a check-in (for organizers)
   */
  static async updateCheckInValidation(
    checkInId: string,
    isValidated: boolean,
    organizerId: string,
    validationNotes?: string
  ): Promise<{ checkIn?: any; error?: string }> {
    try {
      // Get the check-in to get the event_id
      const { data: checkIn, error: fetchError } = await supabase
        .from('attendance_logs')
        .select('event_id')
        .eq('id', checkInId)
        .maybeSingle();

      if (fetchError) {
        return { error: fetchError.message || 'Failed to fetch check-in' };
      }

      if (!checkIn) {
        return { error: 'Check-in not found' };
      }

      // Get the event to verify ownership
      const eventResult = await this.getEventById(checkIn.event_id);
      if (eventResult.error || !eventResult.event) {
        return { error: 'Event not found' };
      }

      // Verify organizer is the event creator
      if (eventResult.event.created_by !== organizerId) {
        return { error: 'Only the event organizer can validate check-ins' };
      }

      const updateData: any = {
        is_validated: isValidated,
        validated_by: isValidated ? organizerId : null
      };

      if (validationNotes !== undefined) {
        updateData.validation_notes = validationNotes;
      }

      // Update the check-in and get the count of affected rows
      const { data: updatedRows, error: updateError, count } = await supabase
        .from('attendance_logs')
        .update(updateData)
        .eq('id', checkInId)
        .select('id', { count: 'exact' });

      if (updateError) {
        LoggerService.serviceError('EventService', 'Update error', updateError);
        return { error: updateError.message || 'Failed to update check-in' };
      }

      // Check if any rows were actually updated
      if (!updatedRows || updatedRows.length === 0) {
        LoggerService.serviceError('EventService', 'No rows updated - likely blocked by RLS policy');
        return { error: 'Update failed: No rows were updated. This may be due to missing UPDATE permissions on attendance_logs table. Please ensure the RLS UPDATE policy exists.' };
      }

      // Fetch the updated check-in to return it
      const { data: updatedCheckIn, error: selectError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('id', checkInId)
        .maybeSingle();

      if (selectError) {
        LoggerService.serviceError('EventService', 'Select error', selectError);
        return { error: selectError.message || 'Failed to fetch updated check-in' };
      }

      if (!updatedCheckIn) {
        return { error: 'Check-in not found after update. The update may have been blocked by permissions.' };
      }

      // Verify the update actually changed the validation status
      if (updatedCheckIn.is_validated !== isValidated) {
        LoggerService.serviceError('EventService', 'Update did not change validation status', null, {
          expected: isValidated,
          actual: updatedCheckIn.is_validated,
          checkInId
        });
        return { error: 'Update did not change the validation status. Please check database permissions.' };
      }

      // Log activity
      logActivity(
        organizerId,
        'update',
        'check_in',
        {
          resourceId: checkInId,
          resourceName: 'Check-In Validation',
          details: { is_validated: isValidated, method: 'organizer_update' }
        }
      ).catch(err => LoggerService.serviceError('EventService', 'Failed to log validation update', err));

      return { checkIn: updatedCheckIn };
    } catch (error: any) {
      LoggerService.serviceError('EventService', 'Error in updateCheckInValidation', error);
      return { error: error?.message || 'An unexpected error occurred' };
    }
  }

  /**
   * Get check-in statistics for an event
   */
  static async getCheckInStatistics(eventId: string): Promise<{ stats?: any; error?: string }> {
    try {
      // Get all check-ins
      const { data: checkIns, error: checkInsError } = await supabase
        .from('attendance_logs')
        .select('user_id, check_in_method, is_validated, check_in_date, check_in_time')
        .eq('event_id', eventId);

      if (checkInsError) {
        return { error: checkInsError.message };
      }

      // Get total registrations
      const { count: totalRegistrations } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'registered');

      const totalCheckIns = checkIns?.length || 0;
      const validatedCheckIns = checkIns?.filter(c => c.is_validated).length || 0;
      const unvalidatedCheckIns = totalCheckIns - validatedCheckIns;

      // Count by method
      const byMethod = {
        qr_scan: checkIns?.filter(c => c.check_in_method === 'qr_scan').length || 0,
        manual: checkIns?.filter(c => c.check_in_method === 'manual').length || 0,
        admin_override: checkIns?.filter(c => c.check_in_method === 'admin_override').length || 0
      };

      // Count by date (for multi-day events)
      const byDate: Record<string, number> = {};
      checkIns?.forEach(checkIn => {
        const date = checkIn.check_in_date || new Date(checkIn.check_in_time).toISOString().split('T')[0];
        byDate[date] = (byDate[date] || 0) + 1;
      });

      // Calculate check-in rate based on unique users who checked in
      // (not total check-ins, since multi-day events allow multiple check-ins per user)
      const uniqueUsersCheckedIn = new Set(checkIns?.map(c => c.user_id) || []).size;
      const checkInRate = totalRegistrations && totalRegistrations > 0
        ? ((uniqueUsersCheckedIn / totalRegistrations) * 100).toFixed(2)
        : '0.00';

      return {
        stats: {
          total_check_ins: totalCheckIns,
          validated_check_ins: validatedCheckIns,
          unvalidated_check_ins: unvalidatedCheckIns,
          total_registrations: totalRegistrations || 0,
          unique_users_checked_in: uniqueUsersCheckedIn,
          check_in_rate: `${checkInRate}%`,
          by_method: byMethod,
          by_date: byDate
        }
      };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }
}
