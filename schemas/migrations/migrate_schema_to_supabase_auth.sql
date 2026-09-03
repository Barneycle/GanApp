-- =====================================================
-- COMPLETE MIGRATION: Custom users table to Supabase Auth
-- Run this script to migrate your schema to use auth.users
-- =====================================================

-- Step 1: Drop existing is_admin function if it exists (with any parameter name)
DROP FUNCTION IF EXISTS is_admin(UUID);
DROP FUNCTION IF EXISTS is_admin(user_id UUID);
DROP FUNCTION IF EXISTS is_admin(user_uuid UUID);

-- Step 2: Create helper function to check if user is admin (using auth.users)
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

-- Step 3: Drop foreign key constraints (PostgreSQL doesn't support FKs to auth.users)
-- We'll keep the UUID columns but remove FK constraints
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey;
ALTER TABLE surveys DROP CONSTRAINT IF EXISTS surveys_created_by_fkey;
ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_user_id_fkey;
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_user_id_fkey;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
ALTER TABLE event_cancellation_requests DROP CONSTRAINT IF EXISTS event_cancellation_requests_requested_by_fkey;
ALTER TABLE event_cancellation_requests DROP CONSTRAINT IF EXISTS event_cancellation_requests_reviewed_by_fkey;

-- Step 4: Update create_user_account function for Supabase Auth
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
    -- Check if caller is admin using auth.users
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
    
    -- Return success - actual user creation happens via Supabase Auth API
    RETURN json_build_object(
        'success', true,
        'message', 'User creation validated. Proceed with Supabase Auth signUp.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update list_users function to use auth.users
CREATE OR REPLACE FUNCTION list_users(
    requested_by_uuid UUID,
    active_only BOOLEAN DEFAULT false,
    role_filter TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is admin
    IF NOT is_admin(requested_by_uuid) THEN
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
            u.raw_user_meta_data->>'banned_until' as banned_until,
            COALESCE((u.raw_user_meta_data->>'archived')::boolean, false) as archived
        FROM auth.users u
    ),
    filtered AS (
        SELECT *
        FROM user_data
        WHERE CASE
                WHEN role_filter IS NOT NULL THEN role = role_filter
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
                'archived', archived,
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

-- Step 6: Update ban_user function
CREATE OR REPLACE FUNCTION ban_user(
    target_user_uuid UUID,
    banned_until TIMESTAMP WITH TIME ZONE,
    banned_by_uuid UUID,
    ban_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    admin_check BOOLEAN;
BEGIN
    SELECT is_admin(banned_by_uuid) INTO admin_check;
    
    IF NOT admin_check THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only administrators can ban users'
        );
    END IF;
    
    -- Note: Actual banning requires updating auth.users metadata via Admin API
    -- This function validates permissions only
    RETURN json_build_object(
        'success', true,
        'message', 'Ban validated. Update auth.users metadata via Admin API.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Update assign_user_role function
CREATE OR REPLACE FUNCTION assign_user_role(
    target_user_uuid UUID,
    new_role_text VARCHAR(20),
    assigned_by_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    admin_check BOOLEAN;
BEGIN
    SELECT is_admin(assigned_by_uuid) INTO admin_check;
    
    IF NOT admin_check THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only administrators can assign roles'
        );
    END IF;
    
    IF new_role_text NOT IN ('admin', 'organizer', 'participant') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid role. Must be admin, organizer, or participant'
        );
    END IF;
    
    -- Note: Actual role assignment requires updating auth.users metadata via Admin API
    RETURN json_build_object(
        'success', true,
        'message', 'Role assignment validated. Update auth.users metadata via Admin API.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create user profiles view for easier querying
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

GRANT SELECT ON user_profiles_view TO authenticated;

-- Step 9: Update RLS policies to use auth.uid() (most already do, but verify)
-- RLS policies should already be using auth.uid() which works with auth.users

-- IMPORTANT NOTES:
-- 1. DO NOT drop the public.users table yet if you have existing data
-- 2. Migrate existing data from public.users to auth.users first
-- 3. Foreign key constraints to auth.users are not supported, so they've been removed
-- 4. User creation must be done via Supabase Auth API (signUp or admin.createUser)
-- 5. Role/metadata updates must be done via Supabase Admin API with service role key

-- To complete the migration:
-- 1. Run this script
-- 2. Migrate existing users from public.users to auth.users (if any)
-- 3. Update application code to use Supabase Auth
-- 4. Test thoroughly
-- 5. Drop public.users table only after confirming everything works

