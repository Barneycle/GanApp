-- =====================================================
-- Fix event_registrations to work with Supabase Auth
-- This creates helper functions to get user data without needing a public.users table
-- =====================================================

-- Step 1: Enhance get_user_profile function to return more fields needed for event participants
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_profile JSON;
BEGIN
  SELECT json_build_object(
    'id', id,
    'email', email,
    'first_name', COALESCE(raw_user_meta_data->>'first_name', ''),
    'last_name', COALESCE(raw_user_meta_data->>'last_name', ''),
    'user_type', COALESCE(raw_user_meta_data->>'user_type', ''),
    'organization', COALESCE(raw_user_meta_data->>'affiliated_organization', ''),
    'role', COALESCE(raw_user_meta_data->>'role', raw_app_meta_data->>'role', 'participant'),
    'phone', COALESCE(raw_user_meta_data->>'phone', ''),
    'avatar_url', COALESCE(raw_user_meta_data->>'avatar_url', ''),
    'position', COALESCE(raw_user_meta_data->>'position', '')
  )
  INTO user_profile
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_profile;
END;
$$;

-- Step 2: Create a function to get event participants with user data
CREATE OR REPLACE FUNCTION get_event_participants(event_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result JSON;
BEGIN
  WITH registrations AS (
    SELECT 
      er.id,
      er.user_id,
      er.registration_date,
      er.status,
      er.created_at,
      json_build_object(
        'id', u.id,
        'email', u.email,
        'first_name', COALESCE(u.raw_user_meta_data->>'first_name', ''),
        'last_name', COALESCE(u.raw_user_meta_data->>'last_name', ''),
        'user_type', COALESCE(u.raw_user_meta_data->>'user_type', ''),
        'organization', COALESCE(u.raw_user_meta_data->>'affiliated_organization', ''),
        'role', COALESCE(u.raw_user_meta_data->>'role', u.raw_app_meta_data->>'role', 'participant'),
        'phone', COALESCE(u.raw_user_meta_data->>'phone', ''),
        'avatar_url', COALESCE(u.raw_user_meta_data->>'avatar_url', ''),
        'position', COALESCE(u.raw_user_meta_data->>'position', '')
      ) as user_data
    FROM event_registrations er
    JOIN auth.users u ON er.user_id = u.id
    WHERE er.event_id = event_uuid
      AND er.status = 'registered'
    ORDER BY er.registration_date DESC
  )
  SELECT json_agg(
    json_build_object(
      'id', id,
      'user_id', user_id,
      'registration_date', registration_date,
      'status', status,
      'created_at', created_at,
      'users', user_data
    )
  )
  INTO result
  FROM registrations;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_participants(UUID) TO authenticated;

-- Step 4: Add comments
COMMENT ON FUNCTION get_user_profile(UUID) IS 'Get user profile information from auth.users. Returns JSON with user data.';
COMMENT ON FUNCTION get_event_participants(UUID) IS 'Get event participants with user data joined from auth.users. Returns JSON array.';

-- IMPORTANT NOTES:
-- 1. These functions use Supabase Auth (auth.users) directly - no public.users table needed
-- 2. Use get_event_participants(event_id) RPC function instead of .select('*, users(*)')
-- 3. Or use get_user_profile(user_id) for individual user lookups
-- 4. Update your code to use these RPC functions instead of automatic relationship syntax

