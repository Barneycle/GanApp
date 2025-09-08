-- Debug why triggers aren't working

-- Step 1: Check if triggers are actually active
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%participant%';

-- Step 2: Check current registrations
SELECT 
  er.event_id,
  e.title,
  er.user_id,
  er.status,
  er.created_at
FROM event_registrations er
JOIN events e ON er.event_id = e.id
ORDER BY er.created_at DESC;

-- Step 3: Check current participant counts
SELECT 
  e.id,
  e.title,
  e.current_participants,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.created_at DESC;

-- Step 4: Test trigger manually by inserting a test registration
-- (This will help us see if the trigger fires)
INSERT INTO event_registrations (event_id, user_id, status)
SELECT 
  e.id,
  'test-user-id',
  'registered'
FROM events e
WHERE e.title = 'Sample Event'
LIMIT 1;

-- Step 5: Check if the trigger fired
SELECT 
  e.id,
  e.title,
  e.current_participants
FROM events e
WHERE e.title = 'Sample Event';

-- Step 6: Clean up test data
DELETE FROM event_registrations 
WHERE user_id = 'test-user-id';
