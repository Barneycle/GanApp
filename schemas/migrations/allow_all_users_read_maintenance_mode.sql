-- =====================================================
-- Migration: Allow all authenticated users to read maintenance_mode
-- =====================================================
-- Purpose: Update RLS policy to allow all authenticated users
--          to read maintenance_mode setting (needed for App.jsx 
--          maintenance mode check), while only admins can modify it
-- =====================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Admins can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Users can view maintenance_mode" ON system_settings;

-- Create new policy: Everyone (including unauthenticated) can view maintenance_mode
-- Only admins can view other settings
CREATE POLICY "Users can view maintenance_mode"
  ON system_settings
  FOR SELECT
  USING (
    setting_key = 'maintenance_mode' OR is_admin(auth.uid())
  );

COMMENT ON POLICY "Users can view maintenance_mode" ON system_settings IS 
'Allows all authenticated users to read maintenance_mode setting (needed for App.jsx maintenance check), while only admins can read other settings.';

