-- =====================================================
-- MIGRATION SCRIPT: Migrate from custom users table to Supabase Auth
-- This script updates the schema to use auth.users instead of public.users
-- =====================================================

-- Step 1: Create helper function to check if user is admin (using auth.users)
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM auth.users 
        WHERE id = user_uuid 
        AND (
            COALESCE(raw_user_meta_data->>'role', 'participant') = 'admin'
            OR COALESCE(raw_app_meta_data->>'role', 'participant') = 'admin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update all foreign key references from users(id) to auth.users(id)
-- Note: PostgreSQL doesn't support foreign keys to auth.users directly
-- We'll remove the foreign key constraints and rely on application-level validation

-- Drop foreign key constraints
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey;
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_event_id_fkey;
ALTER TABLE surveys DROP CONSTRAINT IF EXISTS surveys_created_by_fkey;
ALTER TABLE surveys DROP CONSTRAINT IF EXISTS surveys_event_id_fkey;
ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_user_id_fkey;
ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_survey_id_fkey;
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_user_id_fkey;
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_event_id_fkey;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE event_cancellation_requests DROP CONSTRAINT IF EXISTS event_cancellation_requests_requested_by_fkey;
ALTER TABLE event_cancellation_requests DROP CONSTRAINT IF EXISTS event_cancellation_requests_reviewed_by_fkey;
ALTER TABLE event_cancellation_requests DROP CONSTRAINT IF EXISTS event_cancellation_requests_event_id_fkey;

-- Note: We keep the columns but remove foreign key constraints
-- The columns will still reference UUIDs from auth.users, but without FK constraints
-- This is because auth.users is in a different schema and FK constraints can be problematic

-- Step 3: Update create_user_with_role function to use Supabase Auth
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
            'error', 'An account with this email already exists'
        );
    END IF;
    
    -- Return error directing to use Supabase Auth signUp or admin API
    -- This function cannot create users in auth.users directly
    -- Users should be created via Supabase Auth API (signUp or admin.createUser)
    RETURN json_build_object(
        'success', false,
        'error', 'User creation must be done through Supabase Auth API. Use supabase.auth.signUp() or supabase.auth.admin.createUser() with service role key.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update list_users function to use auth.users
CREATE OR REPLACE FUNCTION list_users(
    requested_by_uuid UUID,
    active_only BOOLEAN DEFAULT false,
    role_filter TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    current_user_record RECORD;
    result JSON;
BEGIN
    -- Get current user from auth.users
    SELECT *
    INTO current_user_record
    FROM auth.users
    WHERE id = requested_by_uuid;

    -- Check if user is admin
    IF current_user_record IS NULL
       OR NOT is_admin(requested_by_uuid) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only admins can list users'
        );
    END IF;

    -- Build user list from auth.users
    WITH user_data AS (
        SELECT
            u.id,
            u.email,
            u.created_at,
            u.updated_at,
            u.last_sign_in_at,
            u.raw_user_meta_data->>'first_name' as first_name,
            u.raw_user_meta_data->>'last_name' as last_name,
            u.raw_user_meta_data->>'prefix' as prefix,
            u.raw_user_meta_data->>'middle_initial' as middle_initial,
            u.raw_user_meta_data->>'affix' as affix,
            COALESCE(u.raw_user_meta_data->>'role', u.raw_app_meta_data->>'role', 'participant') as role,
            u.raw_user_meta_data->>'affiliated_organization' as organization,
            COALESCE((u.raw_user_meta_data->>'is_active')::boolean, true) as is_active,
            u.raw_user_meta_data->>'banned_until' as banned_until
        FROM auth.users u
    ),
    filtered AS (
        SELECT *
        FROM user_data
        WHERE CASE
                WHEN role_filter IS NOT NULL
                  THEN role = role_filter
                ELSE true
              END
          AND CASE
                WHEN active_only THEN is_active = true
                ELSE true
              END
    )
    SELECT json_build_object(
        'success', true,
        'users', COALESCE(json_agg(
            json_build_object(
                'id', id,
                'email', email,
                'first_name', first_name,
                'last_name', last_name,
                'prefix', prefix,
                'middle_initial', middle_initial,
                'affix', affix,
                'role', role,
                'organization', organization,
                'is_active', is_active,
                'banned_until', banned_until,
                'created_at', created_at,
                'updated_at', updated_at,
                'last_sign_in_at', last_sign_in_at
            )
        ), '[]'::json)
    ) INTO result
    FROM filtered;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Step 5: Update ban_user function to use auth.users
CREATE OR REPLACE FUNCTION ban_user(
    target_user_uuid UUID,
    banned_until TIMESTAMP WITH TIME ZONE,
    banned_by_uuid UUID,
    ban_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    admin_check BOOLEAN;
BEGIN
    -- Check if caller is admin
    SELECT is_admin(banned_by_uuid) INTO admin_check;
    
    IF NOT admin_check THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only administrators can ban users'
        );
    END IF;
    
    -- Update user metadata in auth.users
    -- Note: This requires updating auth.users metadata via Supabase Admin API
    -- For now, return a message directing to use admin API
    RETURN json_build_object(
        'success', false,
        'error', 'Banning users requires updating auth.users metadata via Supabase Admin API. Use supabase.auth.admin.updateUserById() with service role key.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Update assign_user_role function to use auth.users
CREATE OR REPLACE FUNCTION assign_user_role(
    target_user_uuid UUID,
    new_role_text VARCHAR(20),
    assigned_by_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    admin_check BOOLEAN;
BEGIN
    -- Check if caller is admin
    SELECT is_admin(assigned_by_uuid) INTO admin_check;
    
    IF NOT admin_check THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only administrators can assign roles'
        );
    END IF;
    
    -- Validate role
    IF new_role_text NOT IN ('admin', 'organizer', 'participant') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid role. Must be admin, organizer, or participant'
        );
    END IF;
    
    -- Return message directing to use admin API
    RETURN json_build_object(
        'success', false,
        'error', 'Role assignment requires updating auth.users metadata via Supabase Admin API. Use supabase.auth.admin.updateUserById() with service role key.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create a simplified create_user_account function for admin user creation
-- This will work with Supabase Auth signUp
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
    -- Check if caller is admin
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
    
    -- Check if email already exists
    IF EXISTS(SELECT 1 FROM auth.users WHERE email = user_email) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'An account with this email already exists'
        );
    END IF;
    
    -- Return success - actual user creation happens via Supabase Auth API
    -- The client should call supabase.auth.signUp() after this validation
    RETURN json_build_object(
        'success', true,
        'message', 'User creation validated. Proceed with Supabase Auth signUp.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Update RLS policies to use auth.uid() instead of users table
-- Note: Most RLS policies already use auth.uid(), but we should verify

-- Step 9: Create a view for user profiles (optional, for easier querying)
CREATE OR REPLACE VIEW user_profiles_view AS
SELECT
    u.id,
    u.email,
    u.created_at,
    u.updated_at,
    u.last_sign_in_at,
    u.raw_user_meta_data->>'first_name' as first_name,
    u.raw_user_meta_data->>'last_name' as last_name,
    u.raw_user_meta_data->>'prefix' as prefix,
    u.raw_user_meta_data->>'middle_initial' as middle_initial,
    u.raw_user_meta_data->>'affix' as affix,
    COALESCE(u.raw_user_meta_data->>'role', u.raw_app_meta_data->>'role', 'participant') as role,
    u.raw_user_meta_data->>'affiliated_organization' as affiliated_organization,
    u.raw_user_meta_data->>'avatar_url' as avatar_url,
    COALESCE((u.raw_user_meta_data->>'is_active')::boolean, true) as is_active,
    u.raw_user_meta_data->>'banned_until' as banned_until
FROM auth.users u;

-- Grant access to authenticated users
GRANT SELECT ON user_profiles_view TO authenticated;

-- Step 10: Add comments
COMMENT ON FUNCTION is_admin(UUID) IS 'Checks if a user is an admin by querying auth.users metadata';
COMMENT ON FUNCTION list_users(UUID, BOOLEAN, TEXT) IS 'Lists users from auth.users. Admin only.';
COMMENT ON FUNCTION create_user_account(TEXT, TEXT, VARCHAR, UUID) IS 'Validates admin user creation. Actual creation happens via Supabase Auth API.';
COMMENT ON VIEW user_profiles_view IS 'View of user profiles from auth.users metadata';

-- IMPORTANT NOTES:
-- 1. The public.users table should be dropped AFTER migrating all data
-- 2. Foreign key constraints to auth.users are not supported, so we removed them
-- 3. User creation must be done via Supabase Auth API (signUp or admin.createUser)
-- 4. Role and metadata updates must be done via Supabase Admin API
-- 5. All existing data in public.users needs to be migrated to auth.users before dropping the table

