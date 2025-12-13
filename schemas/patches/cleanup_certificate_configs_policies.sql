-- =====================================================
-- CLEANUP CERTIFICATE CONFIGS POLICIES
-- Run this FIRST to remove all existing policies
-- Then run create_certificate_configs_table.sql
-- =====================================================

-- Drop all existing policies on certificate_configs table
-- This will remove any problematic policies that query users table

-- First, list all existing policies (for reference)
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'certificate_configs';

-- Drop all policies with known names
DROP POLICY IF EXISTS "Organizers can view their event certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Organizers can create certificate configs for their events" ON certificate_configs;
DROP POLICY IF EXISTS "Organizers can update their event certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Participants can view certificate configs for registered events" ON certificate_configs;
DROP POLICY IF EXISTS "Admins can manage all certificate configs" ON certificate_configs;

-- Alternative: Drop ALL policies on the table (more aggressive cleanup)
-- Uncomment the following if you want to drop all policies at once:
/*
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'certificate_configs') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON certificate_configs';
    END LOOP;
END $$;
*/

-- Verify all policies are removed
SELECT 
  'Policies remaining:' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'certificate_configs';

-- Now you can safely run create_certificate_configs_table.sql to recreate policies correctly

