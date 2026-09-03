-- =====================================================
-- FIX ACTIVITY LOGS SETUP
-- =====================================================
-- This script adds missing RLS policies and functions
-- for an existing activity_logs table
-- =====================================================

-- Drop ALL existing policies (including any variations)
DROP POLICY IF EXISTS "Users can view their own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can create their own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can delete activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can update activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can insert activity logs" ON activity_logs;

-- =====================================================
-- HELPER FUNCTION: Check if user is admin
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT COALESCE(
    (raw_user_meta_data->>'role')::text,
    (raw_app_meta_data->>'role')::text,
    'participant'
  )
  INTO user_role
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_role = 'admin';
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES - ADMIN ONLY
-- =====================================================

-- Only admins can view activity logs
CREATE POLICY "Admins can view activity logs"
  ON activity_logs
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Only admins can insert activity logs
CREATE POLICY "Admins can insert activity logs"
  ON activity_logs
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can update activity logs
CREATE POLICY "Admins can update activity logs"
  ON activity_logs
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can delete activity logs
CREATE POLICY "Admins can delete activity logs"
  ON activity_logs
  FOR DELETE
  USING (is_admin(auth.uid()));

-- =====================================================
-- FUNCTION: Log Activity
-- =====================================================

CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id UUID DEFAULT NULL,
  p_resource_name TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    resource_name,
    details,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_details,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to authenticated users to call this function
GRANT EXECUTE ON FUNCTION log_activity(UUID, VARCHAR, VARCHAR, UUID, TEXT, JSONB, INET, TEXT) TO authenticated;

-- =====================================================
-- HELPER FUNCTION: Get User Profile
-- =====================================================
-- This function allows fetching user profile from auth.users

CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile JSON;
BEGIN
  SELECT json_build_object(
    'id', id,
    'email', email,
    'first_name', COALESCE(raw_user_meta_data->>'first_name', ''),
    'last_name', COALESCE(raw_user_meta_data->>'last_name', ''),
    'role', COALESCE(raw_user_meta_data->>'role', 'participant'),
    'phone', COALESCE(raw_user_meta_data->>'phone', ''),
    'avatar_url', COALESCE(raw_user_meta_data->>'avatar_url', '')
  )
  INTO user_profile
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_profile;
END;
$$;

-- Grant permission to authenticated users to call this function
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

-- =====================================================
-- VERIFY SETUP
-- =====================================================

-- Check if table exists and has RLS enabled
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    RAISE NOTICE '✓ activity_logs table exists';
  ELSE
    RAISE WARNING '✗ activity_logs table does NOT exist';
  END IF;
  
  IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'activity_logs') THEN
    RAISE NOTICE '✓ RLS policies exist';
  ELSE
    RAISE WARNING '✗ RLS policies do NOT exist';
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'log_activity') THEN
    RAISE NOTICE '✓ log_activity function exists';
  ELSE
    RAISE WARNING '✗ log_activity function does NOT exist';
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'get_user_profile') THEN
    RAISE NOTICE '✓ get_user_profile function exists';
  ELSE
    RAISE WARNING '✗ get_user_profile function does NOT exist';
  END IF;
END $$;

