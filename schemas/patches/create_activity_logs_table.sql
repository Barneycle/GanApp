-- =====================================================
-- ACTIVITY LOGS / AUDIT TRAIL TABLE
-- =====================================================
-- This table tracks all user actions for audit purposes

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- References auth.users(id) - no FK constraint since auth.users is in different schema
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'view', 'login', 'logout', etc.
  resource_type VARCHAR(50) NOT NULL, -- 'event', 'survey', 'user', 'registration', etc.
  resource_id UUID, -- ID of the affected resource
  resource_name TEXT, -- Human-readable name of the resource
  details JSONB, -- Additional details about the action (before/after values, etc.)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_id ON activity_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_created ON activity_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_resource ON activity_logs(action, resource_type, created_at DESC);

-- =====================================================
-- HELPER FUNCTION: Check if user is admin
-- =====================================================
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

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Only admins can view activity logs
CREATE POLICY "Admins can view activity logs"
  ON activity_logs
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Only admins can insert activity logs
CREATE POLICY "Admins can insert activity logs"
  ON activity_logs
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can update activity logs
CREATE POLICY "Admins can update activity logs"
  ON activity_logs
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can delete activity logs
CREATE POLICY "Admins can delete activity logs"
  ON activity_logs
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Function to automatically log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id UUID DEFAULT NULL,
  p_resource_name TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    resource_name,
    details,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_details,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Get User Profile
-- =====================================================
-- This function allows fetching user profile from auth.users
-- It should already exist, but we'll create it if it doesn't

CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile JSON;
BEGIN
  SELECT json_build_object(
    'id', id,
    'email', email,
    'first_name', COALESCE(raw_user_meta_data->>'first_name', ''),
    'last_name', COALESCE(raw_user_meta_data->>'last_name', ''),
    'role', COALESCE(raw_user_meta_data->>'role', 'participant'),
    'phone', COALESCE(raw_user_meta_data->>'phone', ''),
    'avatar_url', COALESCE(raw_user_meta_data->>'avatar_url', '')
  )
  INTO user_profile
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_profile;
END;
$$;

-- Grant permission to authenticated users to call this function
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_profile(UUID) IS 'Get user profile information from auth.users table';

