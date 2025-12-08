-- =====================================================
-- SYSTEM SETTINGS TABLE
-- =====================================================
-- This table stores system-wide settings that can be
-- managed by administrators
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID, -- References auth.users(id)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Helper function to check if user is admin (reuse if exists, otherwise create)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT COALESCE(
    (raw_user_meta_data->>'role')::text,
    (raw_app_meta_data->>'role')::text,
    'participant'
  )
  INTO user_role
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_role = 'admin';
END;
$$;

-- Only admins can view system settings
CREATE POLICY "Admins can view system settings"
  ON system_settings
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Only admins can insert system settings
CREATE POLICY "Admins can insert system settings"
  ON system_settings
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can update system settings
CREATE POLICY "Admins can update system settings"
  ON system_settings
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can delete system settings
CREATE POLICY "Admins can delete system settings"
  ON system_settings
  FOR DELETE
  USING (is_admin(auth.uid()));

-- =====================================================
-- INITIAL DEFAULT SETTINGS
-- =====================================================

-- Insert default settings if they don't exist
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('maintenance_mode', 'false'::jsonb, 'Temporarily disable the system for maintenance'),
  ('registration_enabled', 'true'::jsonb, 'Allow new users to register'),
  ('event_creation_enabled', 'true'::jsonb, 'Allow organizers to create events'),
  ('survey_creation_enabled', 'true'::jsonb, 'Allow organizers to create surveys'),
  ('email_notifications_enabled', 'true'::jsonb, 'Enable system-wide email notifications'),
  ('max_events_per_user', '10'::jsonb, 'Maximum number of events a user can create'),
  ('max_participants_per_event', '1000'::jsonb, 'Maximum number of participants per event')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- HELPER FUNCTION: Get System Setting
-- =====================================================

CREATE OR REPLACE FUNCTION get_system_setting(setting_key_param VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  setting_val JSONB;
BEGIN
  SELECT setting_value INTO setting_val
  FROM system_settings
  WHERE setting_key = setting_key_param;
  
  RETURN COALESCE(setting_val, 'null'::jsonb);
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION get_system_setting(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

