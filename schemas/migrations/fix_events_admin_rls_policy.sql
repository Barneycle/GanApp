-- =====================================================
-- Migration: Fix events admin RLS policy to use is_admin() function
-- =====================================================
-- Purpose: Update the "Admins can manage all events" policy to use
--          is_admin() function instead of checking users table directly.
--          This ensures admins can see ALL events including cancelled ones.
-- =====================================================

-- Ensure is_admin function exists (should already exist from previous migrations)
-- Using CREATE OR REPLACE which is idempotent
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

-- Grant execute permission (idempotent - safe to run multiple times)
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- Drop the old policy
DROP POLICY IF EXISTS "Admins can manage all events" ON events;

-- Create the new policy using is_admin() function
CREATE POLICY "Admins can manage all events" ON events
  FOR ALL USING (is_admin(auth.uid()));

COMMENT ON POLICY "Admins can manage all events" ON events IS 
'Allows administrators to perform all operations (SELECT, INSERT, UPDATE, DELETE) on all events, including cancelled ones. Uses is_admin() function which checks auth.users metadata.';
