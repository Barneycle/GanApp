-- =====================================================
-- RPC FUNCTION TO CHECK IF EMAIL EXISTS
-- Used for better error messages during login
-- =====================================================

CREATE OR REPLACE FUNCTION check_email_exists(user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  email_exists BOOLEAN;
  normalized_email TEXT;
BEGIN
  -- Normalize the email (lowercase and trim)
  normalized_email := LOWER(TRIM(user_email));
  
  -- Check if email exists in auth.users
  -- Note: Supabase Auth stores emails in lowercase, so we match exactly
  SELECT EXISTS(
    SELECT 1 
    FROM auth.users 
    WHERE LOWER(email) = normalized_email
  ) INTO email_exists;
  
  -- Return result as JSON
  RETURN json_build_object(
    'exists', COALESCE(email_exists, false)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return false on any error to fail safely
    RETURN json_build_object(
      'exists', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to anonymous users (for login page)
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION check_email_exists IS 'Checks if an email exists in auth.users. Used for better login error messages.';

