-- Fix RLS policies to allow participant count updates

-- Step 1: Create a policy that allows anyone to update current_participants
CREATE POLICY "Allow participant count updates" ON events
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 2: Update all participant counts to match actual registrations
UPDATE events 
SET current_participants = (
  SELECT COUNT(*) 
  FROM event_registrations 
  WHERE event_registrations.event_id = events.id 
  AND event_registrations.status = 'registered'
);

-- Step 3: Verify the fix
SELECT 
  e.id,
  e.title,
  e.current_participants,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.created_at DESC;

-- Step 4: Test the policy by trying to update as a different user
-- (This simulates what happens when a participant registers)
UPDATE events 
SET current_participants = 2
WHERE id = '275e68b8-922d-4e37-8d3a-8ad2976b3329';

-- Step 5: Verify the test update worked
SELECT 
  e.id,
  e.title,
  e.current_participants
FROM events e
WHERE e.id = '275e68b8-922d-4e37-8d3a-8ad2976b3329';
