-- =====================================================
-- NOTIFICATION TRIGGERS AND FUNCTIONS
-- =====================================================
-- This file contains database functions and triggers for:
-- 1. Event reminder notifications (cron job)
-- 2. Survey availability notifications (trigger)

-- =====================================================
-- 1. EVENT REMINDER NOTIFICATIONS
-- =====================================================

-- Function to send event reminder notifications
-- This function should be called by a cron job daily
-- It checks for events starting in 24 hours and sends reminders to registered users
CREATE OR REPLACE FUNCTION send_event_reminder_notifications()
RETURNS TABLE (
    events_processed INTEGER,
    notifications_sent INTEGER,
    errors TEXT[]
) AS $$
DECLARE
    event_record RECORD;
    user_record RECORD;
    notification_count INTEGER := 0;
    error_messages TEXT[] := ARRAY[]::TEXT[];
    events_count INTEGER := 0;
    reminder_sent BOOLEAN;
BEGIN
    -- Find events starting in approximately 24 hours (±1 hour window)
    -- Check events that start between 23 and 25 hours from now
    FOR event_record IN
        SELECT 
            e.id,
            e.title,
            e.start_date,
            e.start_time,
            e.status
        FROM events e
        WHERE e.status = 'published'
            AND e.start_date IS NOT NULL
            AND e.start_time IS NOT NULL
            -- Event starts between 23 and 25 hours from now
            AND (e.start_date || ' ' || e.start_time)::timestamp 
                BETWEEN (NOW() + INTERVAL '23 hours') 
                AND (NOW() + INTERVAL '25 hours')
    LOOP
        events_count := events_count + 1;
        
        -- Get all registered users for this event
        FOR user_record IN
            SELECT DISTINCT er.user_id
            FROM event_registrations er
            WHERE er.event_id = event_record.id
                AND er.status = 'registered'
                -- Check if user has notification preferences enabled
                AND EXISTS (
                    SELECT 1 FROM notification_preferences np
                    WHERE np.user_id = er.user_id
                        AND np.event_reminders = true
                )
                -- Check if reminder hasn't been sent already (avoid duplicates)
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n
                    WHERE n.user_id = er.user_id
                        AND n.title = 'Event Reminder'
                        AND n.message LIKE '%' || event_record.title || '%'
                        AND n.created_at > NOW() - INTERVAL '2 hours'
                )
        LOOP
            BEGIN
                -- Create notification for this user
                INSERT INTO notifications (
                    user_id,
                    title,
                    message,
                    type,
                    priority,
                    action_url,
                    action_text,
                    expires_at
                ) VALUES (
                    user_record.user_id,
                    'Event Reminder',
                    'Don''t forget! "' || event_record.title || '" is happening on ' ||
                    TO_CHAR((event_record.start_date || ' ' || event_record.start_time)::timestamp, 'Month DD, YYYY') || '.',
                    'info',
                    'high',
                    '/event-details?eventId=' || event_record.id,
                    'View Event',
                    (event_record.start_date || ' ' || event_record.start_time)::timestamp + INTERVAL '1 day'
                );
                
                notification_count := notification_count + 1;
            EXCEPTION WHEN OTHERS THEN
                -- Log error but continue processing
                error_messages := array_append(
                    error_messages,
                    'Error creating notification for user ' || user_record.user_id || 
                    ' for event ' || event_record.id || ': ' || SQLERRM
                );
            END;
        END LOOP;
    END LOOP;
    
    -- Return results
    RETURN QUERY SELECT events_count, notification_count, error_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for cron job)
GRANT EXECUTE ON FUNCTION send_event_reminder_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION send_event_reminder_notifications() TO service_role;

-- =====================================================
-- 2. SURVEY AVAILABILITY NOTIFICATIONS
-- =====================================================

-- Function to send survey availability notifications
-- This function is called by a trigger when a survey is created or activated
CREATE OR REPLACE FUNCTION notify_survey_availability()
RETURNS TRIGGER AS $$
DECLARE
    event_record RECORD;
    user_record RECORD;
    survey_event_id UUID;
    event_title TEXT;
BEGIN
    -- Only proceed if survey is being activated (is_active changed from false to true)
    -- or if it's a new survey that's already active
    IF (TG_OP = 'UPDATE' AND OLD.is_active = false AND NEW.is_active = true) OR
       (TG_OP = 'INSERT' AND NEW.is_active = true) THEN
        
        -- Get event information
        SELECT e.id, e.title INTO event_record
        FROM events e
        WHERE e.id = NEW.event_id;
        
        -- If event not found, skip
        IF event_record.id IS NULL THEN
            RETURN NEW;
        END IF;
        
        event_title := event_record.title;
        survey_event_id := event_record.id;
        
        -- Get all registered users for this event who haven't completed the survey
        FOR user_record IN
            SELECT DISTINCT er.user_id
            FROM event_registrations er
            WHERE er.event_id = survey_event_id
                AND er.status = 'registered'
                -- Check if user has notification preferences enabled
                AND EXISTS (
                    SELECT 1 FROM notification_preferences np
                    WHERE np.user_id = er.user_id
                        AND np.survey_notifications = true
                )
                -- Check if user hasn't already completed this survey
                AND NOT EXISTS (
                    SELECT 1 FROM survey_responses sr
                    WHERE sr.survey_id = NEW.id
                        AND sr.user_id = er.user_id
                )
                -- Check if notification hasn't been sent already (avoid duplicates)
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n
                    WHERE n.user_id = er.user_id
                        AND n.title = 'Survey Available'
                        AND n.message LIKE '%' || event_title || '%'
                        AND n.created_at > NOW() - INTERVAL '1 hour'
                )
        LOOP
            BEGIN
                -- Create notification for this user
                INSERT INTO notifications (
                    user_id,
                    title,
                    message,
                    type,
                    priority,
                    action_url,
                    action_text,
                    expires_at
                ) VALUES (
                    user_record.user_id,
                    'Survey Available',
                    'A survey is now available for "' || event_title || '". Please share your feedback!',
                    'info',
                    'normal',
                    '/evaluation?id=' || NEW.id,
                    'Take Survey',
                    NEW.end_date -- Expire when survey ends
                );
            EXCEPTION WHEN OTHERS THEN
                -- Log error but continue processing
                RAISE WARNING 'Error creating survey notification for user %: %', 
                    user_record.user_id, SQLERRM;
            END;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for survey availability notifications
DROP TRIGGER IF EXISTS trg_notify_survey_availability ON surveys;
CREATE TRIGGER trg_notify_survey_availability
    AFTER INSERT OR UPDATE OF is_active ON surveys
    FOR EACH ROW
    EXECUTE FUNCTION notify_survey_availability();

-- =====================================================
-- 3. SETUP PG_CRON FOR EVENT REMINDERS (Optional)
-- =====================================================
-- Note: pg_cron extension must be enabled in Supabase
-- Run this in Supabase SQL Editor if pg_cron is available:

-- Schedule daily event reminder check at 7 AM Philippine Time (UTC+8)
-- 7 AM PHT = 23:00 UTC (11 PM UTC previous day)
SELECT cron.schedule(
    'send-event-reminders',
    '0 23 * * *', -- 7 AM Philippine Time (23:00 UTC)
    $$SELECT send_event_reminder_notifications()$$
);

-- To check scheduled jobs:
SELECT * FROM cron.job;

-- To unschedule (only run this if you want to remove the scheduled job):
-- SELECT cron.unschedule('send-event-reminders');

-- =====================================================
-- 4. MANUAL TESTING FUNCTIONS
-- =====================================================

-- Test event reminder function manually:
SELECT * FROM send_event_reminder_notifications();

-- Test survey notification by activating a survey:
UPDATE surveys SET is_active = true WHERE id = 'your-survey-id';

