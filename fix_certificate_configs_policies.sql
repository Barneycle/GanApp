-- =====================================================
-- FIX CERTIFICATE CONFIGS POLICIES
-- Removes problematic policies that query users table
-- Run this BEFORE running create_certificate_configs_table.sql
-- =====================================================

-- Drop all existing policies on certificate_configs table
DROP POLICY IF EXISTS "Organizers can view their event certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Organizers can create certificate configs for their events" ON certificate_configs;
DROP POLICY IF EXISTS "Organizers can update their event certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Participants can view certificate configs for registered events" ON certificate_configs;
DROP POLICY IF EXISTS "Admins can manage all certificate configs" ON certificate_configs;

-- Now run create_certificate_configs_table.sql to recreate the policies correctly

