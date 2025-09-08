-- Test the registration flow to see what's happening

-- Step 1: Check current registrations
SELECT 
  er.id,
  er.event_id,
  er.user_id,
  er.status,
  er.created_at
FROM event_registrations er
WHERE er.event_id = 'b42ddfcb-938a-4e9a-88a4-a11e78d71851'
ORDER BY er.created_at DESC;

-- Step 2: Check if there are any triggers on event_registrations
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'event_registrations';

-- Step 3: Check RLS policies on event_registrations
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'event_registrations';

-- Step 4: Test manual registration insert
INSERT INTO event_registrations (event_id, user_id, status)
VALUES ('b42ddfcb-938a-4e9a-88a4-a11e78d71851', 'c1e1fab3-825d-4213-871c-4685869099ed', 'registered');

-- Step 5: Check if the registration was created
SELECT 
  er.id,
  er.event_id,
  er.user_id,
  er.status,
  er.created_at
FROM event_registrations er
WHERE er.event_id = 'b42ddfcb-938a-4e9a-88a4-a11e78d71851'
ORDER BY er.created_at DESC;

-- Step 6: Clean up test data
DELETE FROM event_registrations 
WHERE event_id = 'b42ddfcb-938a-4e9a-88a4-a11e78d71851' 
AND user_id = 'c1e1fab3-825d-4213-871c-4685869099ed'
AND status = 'registered';
