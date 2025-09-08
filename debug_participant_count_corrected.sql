-- Debug script without updated_at column (since it doesn't exist)

-- Check if triggers exist
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%participant%';

-- Check current registration statuses (without updated_at)
SELECT 
  er.event_id,
  e.title,
  er.user_id,
  er.status,
  er.created_at
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
