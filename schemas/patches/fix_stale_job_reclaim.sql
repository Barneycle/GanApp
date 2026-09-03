-- Reclaim jobs left in "processing" when a browser tab is backgrounded or closed.
-- get_next_job previously only selected status = 'pending', so those rows never ran again.

CREATE OR REPLACE FUNCTION get_next_job()
RETURNS TABLE (
  id UUID,
  job_type VARCHAR,
  job_data JSONB,
  status VARCHAR,
  priority INTEGER,
  attempts INTEGER,
  max_attempts INTEGER,
  error_message TEXT,
  result_data JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_job_id UUID;
  v_current_attempts INTEGER;
  v_stale_after INTERVAL := INTERVAL '2 minutes';
BEGIN
  UPDATE job_queue
  SET status = 'failed',
      error_message = COALESCE(NULLIF(error_message, ''), 'Job timed out while processing'),
      completed_at = NOW()
  WHERE status = 'processing'
    AND started_at IS NOT NULL
    AND started_at < NOW() - v_stale_after
    AND attempts >= max_attempts;

  SELECT job_queue.id, job_queue.attempts INTO v_job_id, v_current_attempts
  FROM job_queue
  WHERE job_queue.status = 'pending'
     OR (
       job_queue.status = 'processing'
       AND job_queue.started_at IS NOT NULL
       AND job_queue.started_at < NOW() - v_stale_after
       AND job_queue.attempts < job_queue.max_attempts
     )
  ORDER BY job_queue.priority ASC, job_queue.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_job_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE job_queue
  SET status = 'processing',
      started_at = NOW(),
      attempts = v_current_attempts + 1
  WHERE job_queue.id = v_job_id;

  RETURN QUERY
  SELECT
    j.id,
    j.job_type,
    j.job_data,
    j.status,
    j.priority,
    j.attempts,
    j.max_attempts,
    j.error_message,
    j.result_data,
    j.created_by,
    j.created_at,
    j.started_at,
    j.completed_at
  FROM job_queue j
  WHERE j.id = v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_next_job() TO authenticated;
