-- =====================================================
-- FIX CERTIFICATE CONFIGS RLS POLICIES
-- Fixes UPDATE policy to include WITH CHECK clause
-- =====================================================

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Organizers can update their event certificate configs" ON certificate_configs;

-- Recreate UPDATE policy with both USING and WITH CHECK clauses
CREATE POLICY "Organizers can update their event certificate configs"
  ON certificate_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = certificate_configs.event_id
      AND events.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = certificate_configs.event_id
      AND events.created_by = auth.uid()
    )
  );

-- Also ensure INSERT policy allows the operation
-- (This should already exist, but we'll verify it's correct)
DROP POLICY IF EXISTS "Organizers can create certificate configs for their events" ON certificate_configs;

-- INSERT policy: Allow if user is the event creator AND the created_by matches
-- Note: In WITH CHECK, we reference the NEW row as certificate_configs
CREATE POLICY "Organizers can create certificate configs for their events"
  ON certificate_configs
  FOR INSERT
  WITH CHECK (
    -- Ensure the event exists and the user is the creator
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = certificate_configs.event_id
      AND events.created_by = auth.uid()
    )
    -- Ensure the created_by field matches the authenticated user
    AND certificate_configs.created_by = auth.uid()
    -- Ensure auth.uid() is not null (user is authenticated)
    AND auth.uid() IS NOT NULL
  );

-- Also add a policy to allow admins to insert (if needed)
DROP POLICY IF EXISTS "Admins can create certificate configs" ON certificate_configs;

CREATE POLICY "Admins can create certificate configs"
  ON certificate_configs
  FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    AND auth.uid() IS NOT NULL
  );

