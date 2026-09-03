-- =====================================================
-- DROP ALL POLICIES ON CERTIFICATE_CONFIGS TABLE
-- Run this to clean up before recreating policies
-- =====================================================

-- Drop all policies on certificate_configs table
-- This removes any policies that might cause permission errors

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

-- Verify all policies are removed
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ All policies removed successfully'
    ELSE '⚠ ' || COUNT(*)::text || ' policies still exist'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'certificate_configs';

