-- Check what's actually happening with registrations

-- Step 1: Check all registrations for the event
SELECT 
  er.event_id,
  e.title,
  er.user_id,
  er.status,
  er.created_at
FROM event_registrations er
JOIN events e ON er.event_id = e.id
WHERE er.event_id = 'b42ddfcb-938a-4e9a-88a4-a11e78d71851'
ORDER BY er.created_at DESC;

-- Step 2: Check current participant count
SELECT 
  e.id,
  e.title,
  e.current_participants as db_count,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered,
  COUNT(CASE WHEN er.status = 'cancelled' THEN 1 END) as actual_cancelled
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
WHERE e.id = 'b42ddfcb-938a-4e9a-88a4-a11e78d71851'
GROUP BY e.id, e.title, e.current_participants;

-- Step 3: Check if there are multiple users registered
SELECT 
  er.event_id,
  COUNT(DISTINCT er.user_id) as unique_users,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as registered_count
FROM event_registrations er
WHERE er.event_id = 'b42ddfcb-938a-4e9a-88a4-a11e78d71851'
GROUP BY er.event_id;
