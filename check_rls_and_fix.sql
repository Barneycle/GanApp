-- Check RLS policies on events table
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
WHERE tablename = 'events';

-- Check if RLS is enabled on events table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'events';

-- Try to update the participant count manually with explicit permissions
-- First, let's see what the current state is
SELECT 
  e.id,
  e.title,
  e.current_participants,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.created_at DESC;

-- Try a direct update to see if it works
UPDATE events 
SET current_participants = 1
WHERE id = '275e68b8-922d-4e37-8d3a-8ad2976b3329';

-- Check if the update worked
SELECT 
  e.id,
  e.title,
  e.current_participants
FROM events e
WHERE e.id = '275e68b8-922d-4e37-8d3a-8ad2976b3329';
