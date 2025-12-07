-- =====================================================
-- ACTIVITY LOGS / AUDIT TRAIL TABLE
-- =====================================================
-- This table tracks all user actions for audit purposes

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Allow users to view their own activity logs
CREATE POLICY "Users can view their own activity logs"
  ON activity_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins to view all activity logs
CREATE POLICY "Admins can view all activity logs"
  ON activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Allow authenticated users to insert their own activity logs
CREATE POLICY "Users can create their own activity logs"
  ON activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins can delete activity logs (for cleanup)
CREATE POLICY "Admins can delete activity logs"
  ON activity_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

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

