-- Comprehensive fix for participant count issues

-- Step 1: Disable RLS temporarily to fix the counts
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Step 2: Update all participant counts
UPDATE events 
SET current_participants = (
  SELECT COUNT(*) 
  FROM event_registrations 
  WHERE event_registrations.event_id = events.id 
  AND event_registrations.status = 'registered'
);

-- Step 3: Re-enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a policy that allows updates to current_participants
-- Drop existing policies first
DROP POLICY IF EXISTS "Allow updates to current_participants" ON events;

-- Create a new policy that allows updates to current_participants
CREATE POLICY "Allow updates to current_participants" ON events
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 5: Verify the fix
SELECT 
  e.id,
  e.title,
  e.current_participants,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.created_at DESC;

-- Step 6: Test a manual update
UPDATE events 
SET current_participants = 1
WHERE id = '275e68b8-922d-4e37-8d3a-8ad2976b3329';

-- Step 7: Verify the test update worked
SELECT 
  e.id,
  e.title,
  e.current_participants
FROM events e
WHERE e.id = '275e68b8-922d-4e37-8d3a-8ad2976b3329';
