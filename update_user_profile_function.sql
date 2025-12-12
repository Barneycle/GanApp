-- =====================================================
-- UPDATE USER PROFILE FUNCTION
-- Allows admins to update user metadata (profile information)
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_profile(
  target_user_id UUID,
  prefix TEXT DEFAULT NULL,
  first_name TEXT DEFAULT NULL,
  middle_initial TEXT DEFAULT NULL,
  last_name TEXT DEFAULT NULL,
  affix TEXT DEFAULT NULL,
  affiliated_organization TEXT DEFAULT NULL,
  role TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_metadata JSONB;
  updated_metadata JSONB;
  result JSON;
  caller_role TEXT;
BEGIN
  -- Check if caller is admin
  SELECT COALESCE(
    (raw_user_meta_data->>'role')::text,
    (raw_app_meta_data->>'role')::text,
    'participant'
  )
  INTO caller_role
  FROM auth.users
  WHERE id = auth.uid();

  IF caller_role <> 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can update user profiles');
  END IF;

  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Get current metadata
  SELECT COALESCE(raw_user_meta_data, '{}'::jsonb)
  INTO current_metadata
  FROM auth.users
  WHERE id = target_user_id;

  -- Start with current metadata
  updated_metadata := current_metadata;

  -- Update only provided fields (NULL means don't update)
  IF prefix IS NOT NULL THEN
    updated_metadata := updated_metadata || jsonb_build_object('prefix', prefix);
  END IF;

  IF first_name IS NOT NULL THEN
    updated_metadata := updated_metadata || jsonb_build_object('first_name', first_name);
  END IF;

  IF middle_initial IS NOT NULL THEN
    updated_metadata := updated_metadata || jsonb_build_object('middle_initial', middle_initial);
  END IF;

  IF last_name IS NOT NULL THEN
    updated_metadata := updated_metadata || jsonb_build_object('last_name', last_name);
  END IF;

  IF affix IS NOT NULL THEN
    updated_metadata := updated_metadata || jsonb_build_object('affix', affix);
  END IF;

  IF affiliated_organization IS NOT NULL THEN
    updated_metadata := updated_metadata || jsonb_build_object('affiliated_organization', affiliated_organization);
  END IF;

  IF role IS NOT NULL THEN
    -- Validate role
    IF role NOT IN ('admin', 'organizer', 'participant') THEN
      RETURN json_build_object('success', false, 'error', 'Invalid role. Must be admin, organizer, or participant');
    END IF;
    updated_metadata := updated_metadata || jsonb_build_object('role', role);
  END IF;

  -- Update user metadata
  UPDATE auth.users
  SET raw_user_meta_data = updated_metadata,
      updated_at = NOW()
  WHERE id = target_user_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
-- Note: You may want to restrict this to admins only using RLS or a role check
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION update_user_profile IS 'Update user profile metadata (admin only - should be restricted via RLS or application logic)';
