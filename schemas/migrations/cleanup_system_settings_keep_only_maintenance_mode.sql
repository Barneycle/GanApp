-- =====================================================
-- Migration: Cleanup system_settings to keep only maintenance_mode
-- =====================================================
-- Purpose: Remove deprecated settings (registration_enabled, 
--          event_creation_enabled, survey_creation_enabled, 
--          email_notifications_enabled) and ensure only 
--          maintenance_mode remains
-- =====================================================

-- Delete deprecated settings that are no longer used
DELETE FROM system_settings 
WHERE setting_key IN (
  'registration_enabled',
  'event_creation_enabled',
  'survey_creation_enabled',
  'email_notifications_enabled'
);

-- Ensure maintenance_mode exists with default value if it doesn't exist
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('maintenance_mode', 'false'::jsonb, 'Temporarily disable the system for maintenance')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comment
COMMENT ON TABLE system_settings IS 'System-wide settings managed by administrators. Currently only maintenance_mode is supported.';

