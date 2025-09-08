-- Test if triggers are actually working

-- Step 1: Check current state
SELECT 
  e.id,
  e.title,
  e.current_participants,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.created_at DESC;

-- Step 2: Manually insert a registration to test the trigger
INSERT INTO event_registrations (event_id, user_id, status)
VALUES ('275e68b8-922d-4e37-8d3a-8ad2976b3329', 'test-user-123', 'registered');

-- Step 3: Check if the trigger fired
SELECT 
  e.id,
  e.title,
  e.current_participants
FROM events e
WHERE e.id = '275e68b8-922d-4e37-8d3a-8ad2976b3329';

-- Step 4: Check the registration was created
SELECT 
  er.event_id,
  er.user_id,
  er.status,
  er.created_at
FROM event_registrations er
WHERE er.user_id = 'test-user-123';

-- Step 5: Clean up test data
DELETE FROM event_registrations 
WHERE user_id = 'test-user-123';
