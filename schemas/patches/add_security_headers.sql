-- =====================================================
-- SECURITY HEADERS CONFIGURATION
-- =====================================================
-- Note: These headers should be configured at the server/CDN level
-- This SQL file documents the recommended headers
-- For Supabase, configure via Supabase Dashboard or Edge Functions
-- For Vercel, configure via vercel.json (already configured)
-- For Cloudflare, configure via Page Rules or Workers
--
-- RECOMMENDED SECURITY HEADERS (configure in vercel.json or CDN):
-- Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';
-- X-Content-Type-Options: nosniff
-- X-Frame-Options: DENY
-- X-XSS-Protection: 1; mode=block
-- Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
-- Referrer-Policy: strict-origin-when-cross-origin
-- Permissions-Policy: geolocation=(), microphone=(), camera=()

-- =====================================================
-- DATABASE-LEVEL SECURITY ENHANCEMENTS
-- =====================================================

-- Function to log security events
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- 'rate_limit_exceeded', 'suspicious_activity', 'failed_login', etc.
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address, created_at);

-- Enable RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events"
  ON security_events
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Function to log security event
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type VARCHAR,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_severity VARCHAR DEFAULT 'low'
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO security_events (
    event_type,
    user_id,
    ip_address,
    user_agent,
    details,
    severity
  ) VALUES (
    p_event_type,
    p_user_id,
    p_ip_address,
    p_user_agent,
    p_details,
    p_severity
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_security_event(VARCHAR, UUID, INET, TEXT, JSONB, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(VARCHAR, UUID, INET, TEXT, JSONB, VARCHAR) TO anon;

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
  p_user_id UUID,
  p_ip_address INET,
  p_threshold INTEGER DEFAULT 10
)
RETURNS BOOLEAN AS $$
DECLARE
  v_recent_events INTEGER;
BEGIN
  -- Count security events in last 5 minutes
  SELECT COUNT(*) INTO v_recent_events
  FROM security_events
  WHERE (
    (user_id = p_user_id AND p_user_id IS NOT NULL)
    OR (ip_address = p_ip_address AND p_ip_address IS NOT NULL)
  )
  AND created_at > NOW() - INTERVAL '5 minutes'
  AND severity IN ('high', 'critical');
  
  RETURN v_recent_events >= p_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION detect_suspicious_activity(UUID, INET, INTEGER) TO authenticated;

