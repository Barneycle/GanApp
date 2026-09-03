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

-- Everyone (including unauthenticated users) can view maintenance_mode (needed for maintenance check)
-- Only admins can view other system settings
CREATE POLICY "Users can view maintenance_mode"
  ON system_settings
  FOR SELECT
  USING (
    setting_key = 'maintenance_mode' OR is_admin(auth.uid())
  );

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
  ('maintenance_mode', 'false'::jsonb, 'Temporarily disable the system for maintenance')
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

