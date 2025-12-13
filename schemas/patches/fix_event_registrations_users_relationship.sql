-- =====================================================
-- Fix relationship between event_registrations and users
-- Since we're using Supabase Auth (auth.users), we need to create
-- a public.users view that Supabase can use for relationships
-- =====================================================

-- Step 1: Drop existing public.users table if it exists (from old schema)
DROP TABLE IF EXISTS public.users CASCADE;

-- Step 2: Create a public.users view that maps to auth.users
-- This allows Supabase PostgREST to recognize relationships
-- Note: Views don't support foreign keys, but Supabase can still use them for joins
CREATE OR REPLACE VIEW public.users AS
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
    u.raw_user_meta_data->>'user_type' as user_type,
    u.raw_user_meta_data->>'affiliated_organization' as organization,
    u.raw_user_meta_data->>'position' as position,
    u.raw_user_meta_data->>'avatar_url' as avatar_url,
    u.raw_user_meta_data->>'phone' as phone,
    u.raw_user_meta_data->>'student_id' as student_id,
    u.raw_user_meta_data->>'employee_id' as employee_id,
    COALESCE((u.raw_user_meta_data->>'is_active')::boolean, true) as is_active,
    COALESCE((u.raw_user_meta_data->>'email_verified')::boolean, false) as email_verified,
    u.raw_user_meta_data->>'banned_until' as banned_until
FROM auth.users u;

-- Step 3: Grant necessary permissions
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.users TO service_role;

-- Step 4: Add a comment to document the view
COMMENT ON VIEW public.users IS 'Public view of auth.users for Supabase relationship recognition. Maps auth.users metadata to a table-like structure that Supabase PostgREST can use for automatic joins.';

-- Step 5: Ensure event_registrations table has proper structure
DO $$
BEGIN
    -- Check if user_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'event_registrations' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE event_registrations ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Step 6: Create an index on user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id 
ON event_registrations(user_id);

-- Step 7: Since Supabase PostgREST uses foreign keys to infer relationships,
-- and we can't create FKs to views, we need to manually tell Supabase about the relationship
-- This is done by ensuring the column names match: event_registrations.user_id -> users.id

-- IMPORTANT NOTES:
-- 1. The public.users view is read-only and maps to auth.users
-- 2. Supabase PostgREST may not automatically recognize relationships to views
-- 3. If automatic joins don't work, you may need to:
--    a) Use manual joins in your queries
--    b) Create a materialized table instead of a view (requires sync triggers)
--    c) Use Supabase's relationship API to manually define the relationship
-- 4. Updates to user data must be done via Supabase Auth API, not through this view
-- 5. The view will automatically reflect changes in auth.users

-- ALTERNATIVE: If the view approach doesn't work, you can create a materialized table
-- that syncs with auth.users. Uncomment the following if needed:

/*
-- Create a public.users table that syncs with auth.users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    first_name TEXT,
    last_name TEXT,
    prefix TEXT,
    middle_initial TEXT,
    affix TEXT,
    role TEXT DEFAULT 'participant',
    user_type TEXT,
    organization TEXT,
    position TEXT,
    avatar_url TEXT,
    phone TEXT,
    student_id TEXT,
    employee_id TEXT,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    banned_until TIMESTAMP WITH TIME ZONE
);

-- Create foreign key from event_registrations to public.users
ALTER TABLE event_registrations 
ADD CONSTRAINT event_registrations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Then create triggers to sync auth.users with public.users
*/

