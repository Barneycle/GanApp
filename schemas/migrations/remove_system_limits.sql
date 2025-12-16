-- =====================================================
-- Migration: Remove system limits from system_settings
-- =====================================================
-- Purpose: Remove max_events_per_user and max_participants_per_event
--          settings from the system_settings table
-- =====================================================

-- Delete the max_events_per_user setting
DELETE FROM system_settings 
WHERE setting_key = 'max_events_per_user';

-- Delete the max_participants_per_event setting
DELETE FROM system_settings 
WHERE setting_key = 'max_participants_per_event';

-- Add comment
COMMENT ON TABLE system_settings IS 'System-wide settings managed by administrators. System limits (max_events_per_user, max_participants_per_event) have been removed.';
