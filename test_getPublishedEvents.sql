-- Test what getPublishedEvents should return

-- Step 1: Check what events are published
SELECT 
  e.id,
  e.title,
  e.current_participants as db_count
FROM events e
WHERE e.status = 'published'
ORDER BY e.created_at DESC;

-- Step 2: Check what registrations exist for each event
SELECT 
  e.id,
  e.title,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
WHERE e.status = 'published'
GROUP BY e.id, e.title
ORDER BY e.created_at DESC;

-- Step 3: Simulate what getPublishedEvents should return
SELECT 
  e.id,
  e.title,
  e.current_participants as db_count,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as calculated_count
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
WHERE e.status = 'published'
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.created_at DESC;
