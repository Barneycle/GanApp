-- Fix RLS policy for certificates table to allow users to insert their own certificates
-- Users should be able to generate certificates for themselves

-- Drop existing INSERT policies if they exist (we'll recreate them)
DROP POLICY IF EXISTS "Event organizers can generate certificates" ON certificates;
DROP POLICY IF EXISTS "Admins can generate all certificates" ON certificates;
DROP POLICY IF EXISTS "Users can generate their own certificates" ON certificates;

-- Policy: Users can insert certificates where user_id matches their own ID
-- This allows users to generate certificates for themselves
CREATE POLICY "Users can generate their own certificates" ON certificates
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Policy: Event organizers can generate certificates for their events
CREATE POLICY "Event organizers can generate certificates" ON certificates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Policy: Admins can generate all certificates
CREATE POLICY "Admins can generate all certificates" ON certificates
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

