-- Manually fix participant counts for all events
UPDATE events 
SET current_participants = (
  SELECT COUNT(*) 
  FROM event_registrations 
  WHERE event_registrations.event_id = events.id 
  AND event_registrations.status = 'registered'
);

-- Verify the fix
SELECT 
  e.id,
  e.title,
  e.current_participants,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.created_at DESC;