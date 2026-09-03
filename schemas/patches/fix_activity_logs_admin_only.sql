-- =====================================================
-- FIX ACTIVITY LOGS - ADMIN ONLY ACCESS
-- =====================================================
-- This script drops all existing policies and creates
-- new policies that only allow admins to view/update/delete
-- =====================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can create their own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can delete activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can update activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can view activity logs" ON activity_logs;

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
-- VERIFY SETUP
-- =====================================================
DO $$
DECLARE
  policy_count INTEGER;
  policy_name TEXT;
BEGIN
  -- Check if is_admin function exists
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE NOTICE '✓ is_admin function created';
  ELSE
    RAISE WARNING '✗ is_admin function NOT created';
  END IF;
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'activity_logs';
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✓ % policies created for activity_logs', policy_count;
  ELSE
    RAISE WARNING '✗ Only % policies found (expected at least 4)', policy_count;
  END IF;
  
  -- List all policies
  RAISE NOTICE 'Policies on activity_logs:';
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'activity_logs'
  LOOP
    RAISE NOTICE '  - %', policy_name;
  END LOOP;
END $$;

