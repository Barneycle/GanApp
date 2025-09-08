-- Test if the trigger is working by manually checking participant counts
-- First, let's see the current state
SELECT 
  e.id, 
  e.title, 
  e.current_participants,
  COUNT(er.id) as actual_registrations
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id AND er.status = 'registered'
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.created_at DESC;

-- If the counts don't match, let's fix them manually
UPDATE events 
SET current_participants = (
  SELECT COUNT(*) 
  FROM event_registrations 
  WHERE event_registrations.event_id = events.id 
  AND event_registrations.status = 'registered'
);

-- Check if the trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing, 
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_participant_count';
