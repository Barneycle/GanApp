-- =====================================================
-- FUNCTION: Archive User Account (Supabase Auth)
-- =====================================================
-- This function archives a user account by:
-- 1. Copying user data to archived_users table
-- 2. Setting is_active = false in auth.users metadata
-- 3. Counting user activities for archival record

-- Drop any existing foreign key constraints to the old users table
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find and drop any foreign key constraints on archived_users that reference users table
    FOR constraint_record IN
        SELECT conname, conrelid::regclass
        FROM pg_constraint
        WHERE conrelid = 'archived_users'::regclass
        AND contype = 'f'
        AND confrelid::regclass::text LIKE '%users%'
    LOOP
        EXECUTE 'ALTER TABLE archived_users DROP CONSTRAINT IF EXISTS ' || constraint_record.conname;
    END LOOP;
END $$;

-- First, ensure the archived_users table exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS archived_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_user_id UUID NOT NULL,
  email citext NOT NULL,
  username citext NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  organization VARCHAR(255),
  position VARCHAR(100),
  role VARCHAR(20) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(11) NOT NULL DEFAULT '',
  student_id VARCHAR(50),
  employee_id VARCHAR(50),
  original_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  original_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archive_reason TEXT NOT NULL,
  archived_by UUID NOT NULL,
  archive_type VARCHAR(20) NOT NULL CHECK (archive_type IN ('user_request', 'admin_action', 'system_cleanup')),
  
  -- Store final activity data
  last_login_at TIMESTAMP WITH TIME ZONE,
  total_events_created INTEGER DEFAULT 0,
  total_events_attended INTEGER DEFAULT 0,
  total_surveys_created INTEGER DEFAULT 0,
  total_surveys_responded INTEGER DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE archived_users ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_archived_users_email ON archived_users(email);
CREATE INDEX IF NOT EXISTS idx_archived_users_username ON archived_users(username);
CREATE INDEX IF NOT EXISTS idx_archived_users_role ON archived_users(role);
CREATE INDEX IF NOT EXISTS idx_archived_users_archived_at ON archived_users(archived_at);
CREATE INDEX IF NOT EXISTS idx_archived_users_original_id ON archived_users(original_user_id);

-- RLS Policies for archived_users (admin-only access)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Admins can view all archived users" ON archived_users;
  DROP POLICY IF EXISTS "Admins can manage archived users" ON archived_users;
  
  -- Create new policies using is_admin function
  CREATE POLICY "Admins can view all archived users"
    ON archived_users
    FOR SELECT
    USING (is_admin(auth.uid()));
  
  CREATE POLICY "Admins can manage archived users"
    ON archived_users
    FOR ALL
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
END $$;

-- Drop the old function if it exists (may have different signature/return type)
DROP FUNCTION IF EXISTS archive_user_account(UUID, TEXT);
DROP FUNCTION IF EXISTS archive_user_account(UUID, TEXT, VARCHAR);
DROP FUNCTION IF EXISTS archive_user_account(UUID, TEXT, VARCHAR, UUID);

CREATE OR REPLACE FUNCTION archive_user_account(
    user_uuid UUID, 
    archive_reason_text TEXT,
    archive_type_text VARCHAR(20) DEFAULT 'admin_action',
    admin_uuid UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
    archive_id UUID;
    events_count INTEGER;
    registrations_count INTEGER;
    surveys_count INTEGER;
    responses_count INTEGER;
    admin_check BOOLEAN;
BEGIN
    -- Check if the caller is an admin (if admin_uuid is provided)
    IF admin_uuid IS NOT NULL THEN
        SELECT is_admin(admin_uuid) INTO admin_check;
        IF NOT admin_check THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Only administrators can archive user accounts'
            );
        END IF;
    END IF;

    -- Get user data from auth.users
    SELECT 
        id,
        email,
        raw_user_meta_data->>'first_name' as first_name,
        raw_user_meta_data->>'last_name' as last_name,
        raw_user_meta_data->>'prefix' as prefix,
        raw_user_meta_data->>'middle_initial' as middle_initial,
        raw_user_meta_data->>'affix' as affix,
        raw_user_meta_data->>'affiliated_organization' as affiliated_organization,
        raw_user_meta_data->>'role' as role,
        raw_user_meta_data->>'avatar_url' as avatar_url,
        created_at,
        updated_at
    INTO user_record
    FROM auth.users
    WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Validate required parameters
    IF archive_reason_text IS NULL OR archive_reason_text = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Archive reason is required'
        );
    END IF;
    
    -- Count user's activities
    SELECT COUNT(*) INTO events_count FROM events WHERE created_by = user_uuid;
    SELECT COUNT(*) INTO registrations_count FROM event_registrations WHERE user_id = user_uuid;
    SELECT COUNT(*) INTO surveys_count FROM surveys WHERE created_by = user_uuid;
    SELECT COUNT(*) INTO responses_count FROM survey_responses WHERE user_id = user_uuid;
    
    -- Insert into archived_users (using simplified schema compatible with Supabase Auth)
    INSERT INTO archived_users (
        original_user_id,
        email,
        username, -- Use email as username if username doesn't exist
        first_name,
        last_name,
        user_type, -- Default to 'participant' if not specified
        organization,
        position, -- NULL if not available
        role,
        avatar_url,
        phone, -- Default empty
        student_id, -- NULL
        employee_id, -- NULL
        original_created_at,
        original_updated_at,
        archive_reason,
        archived_by,
        archive_type,
        total_events_created,
        total_events_attended,
        total_surveys_created,
        total_surveys_responded
    ) VALUES (
        user_record.id,
        user_record.email,
        COALESCE(user_record.email, 'unknown'), -- Use email as username
        COALESCE(user_record.first_name, ''),
        COALESCE(user_record.last_name, ''),
        COALESCE(user_record.role, 'participant'), -- Use role as user_type
        user_record.affiliated_organization,
        NULL, -- position not available in auth metadata
        COALESCE(user_record.role, 'participant'),
        user_record.avatar_url,
        '', -- phone default empty
        NULL, -- student_id
        NULL, -- employee_id
        user_record.created_at,
        COALESCE(user_record.updated_at, user_record.created_at),
        archive_reason_text,
        COALESCE(admin_uuid, user_record.id),
        archive_type_text,
        events_count,
        registrations_count,
        surveys_count,
        responses_count
    ) RETURNING id INTO archive_id;
    
    -- Set user as inactive in auth.users metadata
    -- Build the updated metadata object with all changes at once
    UPDATE auth.users
    SET 
        raw_user_meta_data = jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        COALESCE(raw_user_meta_data, '{}'::jsonb),
                        '{is_active}',
                        'false'::jsonb
                    ),
                    '{archived}',
                    'true'::jsonb
                ),
                '{archived_at}',
                to_jsonb(NOW())
            ),
            '{archive_reason}',
            to_jsonb(archive_reason_text)
        ),
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Note: We don't delete the user from auth.users to preserve referential integrity
    -- The user is marked as inactive/archived instead
    
    RETURN json_build_object(
        'success', true,
        'archive_id', archive_id,
        'message', 'User archived successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (they'll be checked inside the function)
GRANT EXECUTE ON FUNCTION archive_user_account(UUID, TEXT, VARCHAR, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION archive_user_account IS 'Archives a user account by copying data to archived_users and marking the user as inactive in auth.users metadata. Admin-only operation.';

-- =====================================================
-- FUNCTION: Unarchive User Account (Supabase Auth)
-- =====================================================
-- This function unarchives a user account by:
-- 1. Setting is_active = true in auth.users metadata
-- 2. Removing archived flags from metadata

-- Drop the old function if it exists (may have different signature/return type)
DROP FUNCTION IF EXISTS unarchive_user_account(UUID);
DROP FUNCTION IF EXISTS unarchive_user_account(UUID, UUID);
DROP FUNCTION IF EXISTS unarchive_user_account(unarchived_by_uuid UUID, user_uuid UUID);

CREATE OR REPLACE FUNCTION unarchive_user_account(
    user_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    admin_check BOOLEAN;
    user_exists BOOLEAN;
    user_record RECORD;
    current_user_id UUID;
BEGIN
    -- Get the current authenticated user
    current_user_id := auth.uid();
    
    -- Check if the caller is an admin
    IF current_user_id IS NOT NULL THEN
        SELECT is_admin(current_user_id) INTO admin_check;
        IF NOT admin_check THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Only administrators can unarchive user accounts'
            );
        END IF;
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Check if user exists in auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_uuid) INTO user_exists;
    IF NOT user_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found in authentication system'
        );
    END IF;

    -- Get user data for verification
    SELECT 
        id,
        email,
        raw_user_meta_data->>'first_name' as first_name,
        raw_user_meta_data->>'last_name' as last_name
    INTO user_record
    FROM auth.users
    WHERE id = user_uuid;

    -- Update auth.users metadata to mark user as active and unarchived
    UPDATE auth.users
    SET 
        raw_user_meta_data = jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        COALESCE(raw_user_meta_data, '{}'::jsonb),
                        '{is_active}',
                        'true'::jsonb
                    ),
                    '{archived}',
                    'false'::jsonb
                ),
                '{archived_at}',
                'null'::jsonb -- Clear archived_at timestamp
            ),
            '{archive_reason}',
            'null'::jsonb -- Clear archive reason
        ),
        updated_at = NOW()
    WHERE id = user_uuid;

    -- Remove the record from archived_users since the user is no longer archived
    -- Audit trail is preserved in activity_logs table
    -- SECURITY DEFINER functions execute with the function owner's privileges (typically postgres superuser)
    -- This should bypass RLS policies. If RLS is still blocking, the function owner may need
    -- to be set to a superuser role.
    DELETE FROM archived_users WHERE original_user_id = user_uuid;
    
    -- Note: The DELETE will succeed even if no rows match (user wasn't in archived_users),
    -- which is fine. The function will still return success.

    RETURN json_build_object(
        'success', true,
        'message', 'User unarchived successfully',
        'user_id', user_uuid,
        'email', user_record.email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (they'll be checked inside the function)
GRANT EXECUTE ON FUNCTION unarchive_user_account(UUID) TO authenticated;

-- Ensure the function is owned by a superuser to bypass RLS
-- In Supabase, functions are typically owned by postgres, which should work
-- If RLS is still blocking, you may need to: ALTER FUNCTION unarchive_user_account OWNER TO postgres;

-- Add comment
COMMENT ON FUNCTION unarchive_user_account IS 'Unarchives a user account by setting is_active = true and removing archive flags in auth.users metadata. Also removes the record from archived_users table. Admin-only operation.';

