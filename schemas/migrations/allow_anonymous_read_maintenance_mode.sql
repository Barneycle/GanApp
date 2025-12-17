-- =====================================================
-- Migration: Allow anonymous/unauthenticated users to read maintenance_mode
-- =====================================================
-- Purpose: Update RLS policy and create a function that allows
--          anonymous users to check maintenance_mode status
--          (needed for App.jsx maintenance check before login)
-- =====================================================

-- Create a SECURITY DEFINER function that bypasses RLS for maintenance_mode
CREATE OR REPLACE FUNCTION get_maintenance_mode()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  setting_val JSONB;
BEGIN
  SELECT setting_value INTO setting_val
  FROM system_settings
  WHERE setting_key = 'maintenance_mode';
  
  -- Return false if setting doesn't exist or is null
  IF setting_val IS NULL THEN
    RETURN false;
  END IF;
  
  -- Handle JSONB boolean values
  IF setting_val::text = 'true' OR setting_val = 'true'::jsonb THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Grant execute permission to everyone (including anonymous)
GRANT EXECUTE ON FUNCTION get_maintenance_mode() TO authenticated;
GRANT EXECUTE ON FUNCTION get_maintenance_mode() TO anon;

COMMENT ON FUNCTION get_maintenance_mode() IS 
'Returns the current maintenance_mode setting. Accessible to all users (including anonymous) for checking maintenance status before login.';

