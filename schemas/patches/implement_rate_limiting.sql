-- =====================================================
-- RATE LIMITING IMPLEMENTATION FOR SUPABASE
-- =====================================================
-- This implements application-level rate limiting using PostgreSQL
-- Prevents abuse and ensures fair resource usage

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL, -- user_id or ip_address
  endpoint VARCHAR(255) NOT NULL, -- API endpoint or action
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 minute',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one record per identifier+endpoint+window
  UNIQUE(identifier, endpoint, window_start)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint 
ON rate_limits(identifier, endpoint, expires_at);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at 
ON rate_limits(expires_at);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Only system can manage rate limits
CREATE POLICY "System manages rate limits"
  ON rate_limits
  FOR ALL
  USING (false) -- No direct access, only via functions
  WITH CHECK (false);

-- Function: Check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier VARCHAR(255),
  p_endpoint VARCHAR(255),
  p_max_requests INTEGER DEFAULT 60,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS JSONB AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_result JSONB;
BEGIN
  -- Get current window start (rounded to minute)
  v_window_start := date_trunc('minute', NOW());
  
  -- Clean up expired records
  DELETE FROM rate_limits 
  WHERE expires_at < NOW();
  
  -- Get or create rate limit record
  INSERT INTO rate_limits (identifier, endpoint, request_count, window_start, expires_at)
  VALUES (p_identifier, p_endpoint, 1, v_window_start, v_window_start + (p_window_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    expires_at = v_window_start + (p_window_seconds || ' seconds')::INTERVAL
  RETURNING request_count INTO v_current_count;
  
  -- Check if limit exceeded
  IF v_current_count > p_max_requests THEN
    v_result := jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_window_start + (p_window_seconds || ' seconds')::INTERVAL,
      'limit', p_max_requests
    );
  ELSE
    v_result := jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - v_current_count,
      'reset_at', v_window_start + (p_window_seconds || ' seconds')::INTERVAL,
      'limit', p_max_requests
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_rate_limit(VARCHAR, VARCHAR, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(VARCHAR, VARCHAR, INTEGER, INTEGER) TO anon;

-- Function: Cleanup old rate limit records (run via cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_rate_limits()');

-- Example usage in application:
-- SELECT check_rate_limit('user-123', '/api/events', 60, 60);
-- Returns: {"allowed": true, "remaining": 59, "reset_at": "...", "limit": 60}

