-- =====================================================
-- DROP ALL CERTIFICATE CONFIGS POLICIES
-- Use this to clean up policies before recreating them
-- =====================================================

-- Drop all existing policies on certificate_configs table
-- This removes any policies that might query users table
DROP POLICY IF EXISTS "Organizers can view their event certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Organizers can create certificate configs for their events" ON certificate_configs;
DROP POLICY IF EXISTS "Organizers can update their event certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Participants can view certificate configs for registered events" ON certificate_configs;
DROP POLICY IF EXISTS "Admins can manage all certificate configs" ON certificate_configs;

-- If you have any other policy names, drop them too:
-- DROP POLICY IF EXISTS "Your Policy Name Here" ON certificate_configs;

-- Verify policies are dropped (optional - will show empty if all dropped)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'certificate_configs';

