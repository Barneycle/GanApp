-- =====================================================
-- COMPREHENSIVE FIX FOR CERTIFICATE CONFIGS RLS POLICIES
-- Fixes all policies to ensure proper access control
-- =====================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Organizers can view their event certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Organizers can create certificate configs for their events" ON certificate_configs;
DROP POLICY IF EXISTS "Organizers can update their event certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Organizers can delete their event certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Participants can view certificate configs for registered events" ON certificate_configs;
DROP POLICY IF EXISTS "Admins can view all certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Admins can manage all certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Admins can create certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Admins can update all certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Admins can delete all certificate configs" ON certificate_configs;

-- SELECT Policies
-- 1. Organizers can view their event certificate configs
CREATE POLICY "Organizers can view their event certificate configs"
  ON certificate_configs
  FOR SELECT
  USING (
    -- User must have organizer role
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
    -- And must be the event creator
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = certificate_configs.event_id
      AND events.created_by = auth.uid()
    )
  );

-- 2. Participants can view certificate configs for registered events
CREATE POLICY "Participants can view certificate configs for registered events"
  ON certificate_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_registrations
      WHERE event_registrations.event_id = certificate_configs.event_id
      AND event_registrations.user_id = auth.uid()
    )
  );

-- INSERT Policies
-- 1. Organizers can create certificate configs for their events
-- This policy allows users with organizer role who created the event to create a certificate config
CREATE POLICY "Organizers can create certificate configs for their events"
  ON certificate_configs
  FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- User must have organizer role
    AND (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
    -- The created_by field must match the authenticated user
    AND certificate_configs.created_by = auth.uid()
    -- The event must exist and the user must be the event creator
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = certificate_configs.event_id
      AND events.created_by = auth.uid()
    )
  );


-- UPDATE Policies
-- 1. Organizers can update their event certificate configs
-- This policy allows users with organizer role who created the event to update the certificate config
CREATE POLICY "Organizers can update their event certificate configs"
  ON certificate_configs
  FOR UPDATE
  USING (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- User must have organizer role
    AND (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
    -- User must be the event creator
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = certificate_configs.event_id
      AND events.created_by = auth.uid()
    )
  )
  WITH CHECK (
    -- After update, user must still be authenticated and have organizer role
    auth.uid() IS NOT NULL
    AND (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
    -- User must still be the event creator
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = certificate_configs.event_id
      AND events.created_by = auth.uid()
    )
  );


-- DELETE Policies (if needed)
-- 1. Organizers can delete their event certificate configs
CREATE POLICY "Organizers can delete their event certificate configs"
  ON certificate_configs
  FOR DELETE
  USING (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- User must have organizer role
    AND (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
    -- User must be the event creator
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = certificate_configs.event_id
      AND events.created_by = auth.uid()
    )
  );


