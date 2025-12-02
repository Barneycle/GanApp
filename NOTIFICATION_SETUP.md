# Notification System Setup Guide

This guide explains how to set up the automated notification triggers for event reminders and survey availability.

## Overview

The notification system includes:
1. **Event Reminders** - Automatically sends reminders 24 hours before events
2. **Survey Availability** - Automatically notifies users when surveys become available

## Setup Instructions

### Option 1: Database Functions + pg_cron (Recommended for Supabase)

1. **Run the SQL script** in your Supabase SQL Editor:
   ```sql
   -- Run notification_triggers.sql
   ```

2. **Enable pg_cron extension** (if not already enabled):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

3. **Schedule the event reminder job**:
   ```sql
   SELECT cron.schedule(
       'send-event-reminders',
       '0 23 * * *', -- 7 AM Philippine Time (23:00 UTC)
       $$SELECT send_event_reminder_notifications()$$
   );
   ```

4. **Verify the schedule**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-event-reminders';
   ```

### Option 2: External Cron Job (Node.js Script)

If pg_cron is not available, use the Node.js script:

1. **Install dependencies** (if not already installed):
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

2. **Set up environment variables** in `.env.local`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Test the script manually**:
   ```bash
   node scripts/send-event-reminders.js
   ```

4. **Set up a cron job** (Linux/Mac):
   ```bash
   # Edit crontab
   crontab -e
   
   # Add this line to run daily at 7 AM Philippine Time (23:00 UTC)
   0 23 * * * cd /path/to/ganapp && node scripts/send-event-reminders.js >> /var/log/event-reminders.log 2>&1
   ```

5. **For Windows**, use Task Scheduler or a service like:
   - GitHub Actions (free)
   - Vercel Cron Jobs
   - AWS Lambda + EventBridge
   - Railway Cron Jobs

### Option 3: Supabase Edge Functions + Cron

1. **Create an Edge Function** (if using Supabase Edge Functions):
   ```typescript
   // supabase/functions/send-event-reminders/index.ts
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
   
   Deno.serve(async (req) => {
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL') ?? '',
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
     )
     
     const { data, error } = await supabase.rpc('send_event_reminder_notifications')
     
     return new Response(JSON.stringify({ data, error }), {
       headers: { 'Content-Type': 'application/json' }
     })
   })
   ```

2. **Deploy the function**:
   ```bash
   supabase functions deploy send-event-reminders
   ```

3. **Schedule via Supabase Dashboard** or use external cron to call the function endpoint

## Survey Availability Notifications

Survey availability notifications are **automatically handled** by a database trigger. No additional setup is required!

The trigger fires when:
- A new survey is created with `is_active = true`
- An existing survey's `is_active` field changes from `false` to `true`

## Testing

### Test Event Reminders

1. **Manually trigger the function**:
   ```sql
   SELECT * FROM send_event_reminder_notifications();
   ```

2. **Or run the Node.js script**:
   ```bash
   node scripts/send-event-reminders.js
   ```

### Test Survey Notifications

1. **Create or activate a survey**:
   ```sql
   -- Activate an existing survey
   UPDATE surveys 
   SET is_active = true 
   WHERE id = 'your-survey-id';
   ```

2. **Check notifications**:
   ```sql
   SELECT * FROM notifications 
   WHERE title = 'Survey Available' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

## Monitoring

### Check Notification Statistics

```sql
-- Count notifications by type
SELECT type, COUNT(*) as count
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY type;

-- Check unread notifications
SELECT COUNT(*) as unread_count
FROM notifications
WHERE read = false;
```

### Check Cron Job Status

```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-event-reminders')
ORDER BY start_time DESC
LIMIT 10;
```

## Troubleshooting

### Event Reminders Not Sending

1. **Check if cron job is scheduled**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-event-reminders';
   ```

2. **Check for errors in cron logs**:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-event-reminders')
   ORDER BY start_time DESC
   LIMIT 5;
   ```

3. **Verify event timing** - Events must start between 23-25 hours from when the job runs

4. **Check user preferences** - Users can disable event reminders in their notification preferences

### Survey Notifications Not Sending

1. **Verify trigger exists**:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trg_notify_survey_availability';
   ```

2. **Check if survey is active**:
   ```sql
   SELECT id, title, is_active FROM surveys WHERE id = 'your-survey-id';
   ```

3. **Verify users are registered**:
   ```sql
   SELECT COUNT(*) FROM event_registrations 
   WHERE event_id = 'your-event-id' AND status = 'registered';
   ```

## Notification Preferences

Users can control notifications via the `notification_preferences` table:

- `event_reminders` - Controls event reminder notifications
- `survey_notifications` - Controls survey availability notifications
- `email_notifications` - Controls email notifications (future)
- `push_notifications` - Controls push notifications (future)

Default values are `true` for all notification types.

