-- Check if triggers exist and are working
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
  e.title,
  er.user_id,
  er.status,
  er.created_at,
  er.updated_at
FROM event_registrations er
JOIN events e ON er.event_id = e.id
ORDER BY er.created_at DESC
LIMIT 10;

-- Check participant counts vs actual registrations
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
