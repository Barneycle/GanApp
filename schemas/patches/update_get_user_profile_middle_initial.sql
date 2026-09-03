-- Update get_user_profile function to include middle_initial
-- This ensures participant names display correctly with middle initials

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
    'middle_initial', COALESCE(raw_user_meta_data->>'middle_initial', ''),
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

-- Grant permission to authenticated users to call this function
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_profile(UUID) IS 'Get user profile information from auth.users including middle_initial';

