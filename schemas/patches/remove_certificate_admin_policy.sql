-- =====================================================
-- REMOVE PROBLEMATIC CERTIFICATE CONFIGS ADMIN POLICY
-- Run this to drop the admin policy that queries users table
-- =====================================================

-- Drop the specific problematic admin policy
DROP POLICY IF EXISTS "Admins can manage all certificate configs" ON certificate_configs;

-- Alternative: Drop ALL policies on certificate_configs (if you want a clean slate)
-- Uncomment the block below if you want to remove all policies:

/*
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'certificate_configs'
    ) 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON certificate_configs';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;
*/

