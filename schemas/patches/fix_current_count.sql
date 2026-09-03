-- Fix the database count to match actual registrations
UPDATE events 
SET current_participants = (
  SELECT COUNT(*) 
  FROM event_registrations 
  WHERE event_registrations.event_id = events.id 
  AND event_registrations.status = 'registered'
)
WHERE id = 'b42ddfcb-938a-4e9a-88a4-a11e78d71851';

-- Verify the fix
SELECT 
  e.id,
  e.title,
  e.current_participants as db_count,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
WHERE e.id = 'b42ddfcb-938a-4e9a-88a4-a11e78d71851'
GROUP BY e.id, e.title, e.current_participants;
