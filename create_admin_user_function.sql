-- RPC Function to create user accounts (admin only)
-- This function validates admin permissions and checks if email exists
-- Actual user creation happens via Supabase Auth signUp() in the application

CREATE OR REPLACE FUNCTION create_user_account(
    user_email TEXT,
    user_password TEXT,
    user_role VARCHAR(20),
    created_by_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    admin_check BOOLEAN;
BEGIN
    -- Check if the caller is an admin using existing is_admin function
    SELECT is_admin(created_by_uuid) INTO admin_check;
    
    IF NOT admin_check THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only administrators can create user accounts'
        );
    END IF;
    
    -- Validate role
    IF user_role NOT IN ('admin', 'organizer', 'participant') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid role. Must be admin, organizer, or participant'
        );
    END IF;
    
    -- Check if email already exists in auth.users
    IF EXISTS(SELECT 1 FROM auth.users WHERE email = user_email) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'An account with this email already exists'
        );
    END IF;
    
    -- Return success - actual user creation happens via Supabase Auth signUp() in the app
    RETURN json_build_object(
        'success', true,
        'message', 'User creation validated. Proceed with Supabase Auth signUp.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (they'll be checked inside the function)
GRANT EXECUTE ON FUNCTION create_user_account(TEXT, TEXT, VARCHAR, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_user_account IS 'Validates admin permissions for user creation. Actual creation happens via Supabase Auth signUp() in the application.';

