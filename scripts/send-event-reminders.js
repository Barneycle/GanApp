/**
 * Event Reminder Notification Script
 * 
 * This script can be run as a cron job (e.g., daily at 7 AM Philippine Time / 23:00 UTC)
 * It checks for events starting in 24 hours and sends reminder notifications
 * 
 * Usage:
 *   node scripts/send-event-reminders.js
 * 
 * Or set up as a cron job:
 *   0 23 * * * cd /path/to/project && node scripts/send-event-reminders.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Try to load .env.local from project root or apps/Mobile
const envPaths = [
  path.join(__dirname, '..', '.env.local'),
  path.join(__dirname, '..', 'apps', 'Mobile', '.env.local'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('Warning: .env.local file not found. Using environment variables.');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sendEventReminders() {
  try {
    console.log('Starting event reminder notification process...');
    
    // Find events starting in approximately 24 hours (±1 hour window)
    const now = new Date();
    const twentyThreeHours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const twentyFiveHours = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    
    // Get events starting between 23 and 25 hours from now
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, start_date, start_time, status')
      .eq('status', 'published')
      .not('start_date', 'is', null)
      .not('start_time', 'is', null);
    
    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }
    
    // Filter events that start between 23-25 hours from now
    const upcomingEvents = events.filter(event => {
      const eventStart = new Date(`${event.start_date}T${event.start_time}`);
      return eventStart >= twentyThreeHours && eventStart <= twentyFiveHours;
    });
    
    console.log(`Found ${upcomingEvents.length} events starting in ~24 hours`);
    
    let totalNotificationsSent = 0;
    const errors = [];
    
    for (const event of upcomingEvents) {
      const eventStart = new Date(`${event.start_date}T${event.start_time}`);
      const formattedDate = eventStart.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      
      // Get registered users for this event
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', event.id)
        .eq('status', 'registered');
      
      if (regError) {
        errors.push(`Error fetching registrations for event ${event.id}: ${regError.message}`);
        continue;
      }
      
      if (!registrations || registrations.length === 0) {
        console.log(`No registered users for event: ${event.title}`);
        continue;
      }
      
      // Get unique user IDs
      const userIds = [...new Set(registrations.map(r => r.user_id))];
      
      // Check notification preferences and existing notifications
      for (const userId of userIds) {
        try {
          // Check if user has event reminders enabled
          const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('event_reminders')
            .eq('user_id', userId)
            .single();
          
          // Default to true if preferences don't exist
          if (prefs && prefs.event_reminders === false) {
            continue; // User has disabled event reminders
          }
          
          // Check if reminder was already sent recently (within last 2 hours)
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('title', 'Event Reminder')
            .ilike('message', `%${event.title}%`)
            .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
            .limit(1)
            .single();
          
          if (existingNotification) {
            continue; // Already sent recently
          }
          
          // Create notification
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              title: 'Event Reminder',
              message: `Don't forget! "${event.title}" is happening on ${formattedDate}.`,
              type: 'info',
              priority: 'high',
              action_url: `/event-details?eventId=${event.id}`,
              action_text: 'View Event',
              expires_at: new Date(eventStart.getTime() + 24 * 60 * 60 * 1000).toISOString()
            });
          
          if (notifError) {
            errors.push(`Error creating notification for user ${userId}: ${notifError.message}`);
          } else {
            totalNotificationsSent++;
          }
        } catch (err) {
          errors.push(`Error processing user ${userId} for event ${event.id}: ${err.message}`);
        }
      }
    }
    
    console.log(`\nProcess completed:`);
    console.log(`- Events processed: ${upcomingEvents.length}`);
    console.log(`- Notifications sent: ${totalNotificationsSent}`);
    if (errors.length > 0) {
      console.log(`- Errors: ${errors.length}`);
      errors.forEach(err => console.error(`  - ${err}`));
    }
    
    return {
      eventsProcessed: upcomingEvents.length,
      notificationsSent: totalNotificationsSent,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  sendEventReminders()
    .then(() => {
      console.log('Event reminder script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Event reminder script failed:', error);
      process.exit(1);
    });
}

module.exports = { sendEventReminders };

