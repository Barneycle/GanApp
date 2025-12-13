-- Add UPDATE policy for certificates table
-- Users should be able to update their own certificates (e.g., to update the PDF URL after upload)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can update own certificates" ON certificates;
DROP POLICY IF EXISTS "Event organizers can update event certificates" ON certificates;
DROP POLICY IF EXISTS "Admins can update all certificates" ON certificates;

-- Create UPDATE policy: Users can update their own certificates
-- Using auth.uid() directly (Supabase Auth) - no users table reference
CREATE POLICY "Users can update own certificates" ON certificates
  FOR UPDATE USING (user_id = auth.uid());

-- Also allow event organizers to update certificates for their events
-- Check events table for created_by (not users table)
CREATE POLICY "Event organizers can update event certificates" ON certificates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Note: Admin policy removed since we're using Supabase Auth
-- If you need admin updates, you can add a policy that checks auth.users metadata
-- But for now, users and event organizers can update their own certificates


