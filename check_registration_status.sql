-- Check what's actually in the event_registrations table
SELECT 
  er.event_id,
  e.title,
  er.user_id,
  er.status,
  er.created_at
FROM event_registrations er
JOIN events e ON er.event_id = e.id
WHERE er.event_id = '275e68b8-922d-4e37-8d3a-8ad2976b3329'
ORDER BY er.created_at DESC;

-- Check all registrations for this event
SELECT 
  er.event_id,
  er.user_id,
  er.status,
  er.created_at
FROM event_registrations er
WHERE er.event_id = '275e68b8-922d-4e37-8d3a-8ad2976b3329'
ORDER BY er.created_at DESC;

-- Fix the participant count to match actual registrations
UPDATE events 
SET current_participants = (
  SELECT COUNT(*) 
  FROM event_registrations 
  WHERE event_registrations.event_id = events.id 
  AND event_registrations.status = 'registered'
)
WHERE id = '275e68b8-922d-4e37-8d3a-8ad2976b3329';

-- Verify the fix
SELECT 
  e.id,
  e.title,
  e.current_participants,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered,
  COUNT(CASE WHEN er.status = 'cancelled' THEN 1 END) as actual_cancelled
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
WHERE e.id = '275e68b8-922d-4e37-8d3a-8ad2976b3329'
GROUP BY e.id, e.title, e.current_participants;