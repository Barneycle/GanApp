-- =====================================================
-- BACKGROUND JOB QUEUE SYSTEM
-- =====================================================
-- This implements a job queue for heavy operations like certificate generation
-- Prevents blocking the main application during heavy processing

-- Create job_queue table
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type VARCHAR(100) NOT NULL, -- 'certificate_generation', 'bulk_notification', etc.
  job_data JSONB NOT NULL, -- Job-specific data
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest, 10 = lowest
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  result_data JSONB, -- Store job result
  created_by UUID, -- References auth.users(id) from Supabase Auth (no FK constraint possible)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Remove the problematic unique constraint and create separate indexes instead

-- Indexes for fast job retrieval
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_job_queue_type ON job_queue(job_type, status);
CREATE INDEX IF NOT EXISTS idx_job_queue_created_by ON job_queue(created_by, status);
CREATE INDEX IF NOT EXISTS idx_job_queue_created_at ON job_queue(created_at);

-- Enable RLS
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin (using Supabase Auth metadata)
-- Only create if it doesn't exist (may already exist from other migrations)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if user exists in auth.users and has admin role in metadata
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = user_id
    AND (
      COALESCE(raw_user_meta_data->>'role', 'participant') = 'admin'
      OR COALESCE(raw_app_meta_data->>'role', 'participant') = 'admin'
    )
  );
END;
$$;

-- Grant execute permission (idempotent - safe to run multiple times)
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- Policy: Users can view their own jobs
CREATE POLICY "Users can view their own jobs"
  ON job_queue
  FOR SELECT
  USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- Policy: Users can create jobs
CREATE POLICY "Users can create jobs"
  ON job_queue
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own jobs (for status polling)
CREATE POLICY "Users can update their own jobs"
  ON job_queue
  FOR UPDATE
  USING (auth.uid() = created_by OR is_admin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR is_admin(auth.uid()));

-- Note: System updates (via service role) will bypass RLS automatically

-- Function: Get next pending job
CREATE OR REPLACE FUNCTION get_next_job()
RETURNS TABLE (
  job_id UUID,
  job_type VARCHAR,
  job_data JSONB,
  created_by UUID
) AS $$
DECLARE
  v_job_id UUID;
BEGIN
  -- Lock and get the next pending job (highest priority, oldest first)
  SELECT id INTO v_job_id
  FROM job_queue
  WHERE status = 'pending'
  ORDER BY priority ASC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Prevents multiple workers from picking the same job
  
  IF v_job_id IS NULL THEN
    RETURN; -- No jobs available
  END IF;
  
  -- Update job status to processing
  UPDATE job_queue
  SET status = 'processing',
      started_at = NOW(),
      attempts = attempts + 1
  WHERE id = v_job_id;
  
  -- Return job details
  RETURN QUERY
  SELECT 
    j.id,
    j.job_type,
    j.job_data,
    j.created_by
  FROM job_queue j
  WHERE j.id = v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark job as completed
CREATE OR REPLACE FUNCTION complete_job(
  p_job_id UUID,
  p_result_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE job_queue
  SET status = 'completed',
      completed_at = NOW(),
      result_data = p_result_data
  WHERE id = p_job_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark job as failed
CREATE OR REPLACE FUNCTION fail_job(
  p_job_id UUID,
  p_error_message TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_attempts INTEGER;
  v_max_attempts INTEGER;
BEGIN
  SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
  FROM job_queue
  WHERE id = p_job_id;
  
  IF v_attempts >= v_max_attempts THEN
    -- Max attempts reached, mark as failed permanently
    UPDATE job_queue
    SET status = 'failed',
        error_message = p_error_message,
        completed_at = NOW()
    WHERE id = p_job_id;
  ELSE
    -- Retry by marking as pending again
    UPDATE job_queue
    SET status = 'pending',
        error_message = p_error_message,
        started_at = NULL
    WHERE id = p_job_id;
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_next_job() TO authenticated;
GRANT EXECUTE ON FUNCTION complete_job(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION fail_job(UUID, TEXT) TO authenticated;

-- Grant SELECT, INSERT on job_queue to authenticated users
GRANT SELECT, INSERT ON job_queue TO authenticated;

