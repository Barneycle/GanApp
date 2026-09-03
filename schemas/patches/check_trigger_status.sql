-- Check if the trigger exists and is working
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing, 
  action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%participant%';

-- Check current registration statuses
SELECT 
  er.event_id,
  er.user_id,
  er.status,
  er.created_at
FROM event_registrations er
ORDER BY er.created_at DESC
LIMIT 10;

-- Check current participant counts
SELECT 
  e.id,
  e.title,
  e.current_participants,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered,
  COUNT(CASE WHEN er.status = 'cancelled' THEN 1 END) as actual_cancelled
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.created_at DESC;
