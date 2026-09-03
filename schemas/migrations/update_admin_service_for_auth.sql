-- =====================================================
-- UPDATE ADMIN SERVICE FUNCTIONS FOR SUPABASE AUTH
-- This updates functions that need to work with auth.users
-- =====================================================

-- Update create_user_with_role to work with Supabase Auth
-- Since we can't directly insert into auth.users, this function validates and returns success
-- The actual user creation happens via Supabase Auth API in the application
CREATE OR REPLACE FUNCTION create_user_with_role(
    email_text TEXT,
    username_text TEXT,
    password_text TEXT,
    first_name_text TEXT,
    last_name_text TEXT,
    user_type_text VARCHAR(20),
    role_text VARCHAR(20),
    organization_text TEXT DEFAULT NULL,
    position_text TEXT DEFAULT NULL,
    phone_text VARCHAR(11) DEFAULT '',
    student_id_text VARCHAR(50) DEFAULT NULL,
    employee_id_text VARCHAR(50) DEFAULT NULL,
    created_by_uuid UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    admin_check BOOLEAN;
BEGIN
    -- Check if the caller is an admin using auth.users
    IF created_by_uuid IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'created_by_uuid is required'
        );
    END IF;
    
    -- Check admin status using auth.users
    SELECT is_admin(created_by_uuid) INTO admin_check;
    
    IF NOT admin_check THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only administrators can create users'
        );
    END IF;
    
    -- Validate user type (optional, can be removed if not needed)
    IF user_type_text NOT IN ('psu-student', 'psu-employee', 'outside') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid user type. Must be psu-student, psu-employee, or outside'
        );
    END IF;
    
    -- Validate role
    IF role_text NOT IN ('participant', 'organizer', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid role. Must be participant, organizer, or admin'
        );
    END IF;
    
    -- Check if email already exists in auth.users
    IF EXISTS(SELECT 1 FROM auth.users WHERE email = email_text) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Email already exists'
        );
    END IF;
    
    -- Return success - actual user creation happens via Supabase Auth API
    -- The application should call supabase.auth.signUp() after this validation
    RETURN json_build_object(
        'success', true,
        'message', 'User creation validated. Proceed with Supabase Auth signUp.',
        'email', email_text,
        'role', role_text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the admin service code to use Supabase Auth signUp after validation
-- The createUser function should:
-- 1. Call create_user_with_role for validation
-- 2. If validation succeeds, call supabase.auth.signUp() with the role in metadata
-- 3. Return the created user

