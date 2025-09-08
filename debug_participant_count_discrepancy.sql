-- Check what's actually happening with participant counts

-- Step 1: Check the database current_participants column
SELECT 
  e.id,
  e.title,
  e.current_participants as db_count
FROM events e
ORDER BY e.created_at DESC;

-- Step 2: Check actual registrations
SELECT 
  er.event_id,
  e.title,
  er.user_id,
  er.status,
  er.created_at
FROM event_registrations er
JOIN events e ON er.event_id = e.id
ORDER BY er.created_at DESC;

-- Step 3: Count actual registered participants per event
SELECT 
  e.id,
  e.title,
  e.current_participants as db_count,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered,
  COUNT(CASE WHEN er.status = 'cancelled' THEN 1 END) as actual_cancelled,
  COUNT(er.id) as total_registrations
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.created_at DESC;
