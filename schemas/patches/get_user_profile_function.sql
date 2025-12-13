-- Create a function to get user profile from auth.users
-- This allows client-side code to read other users' information

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

COMMENT ON FUNCTION get_user_profile(UUID) IS 'Get user profile information from auth.users table';

