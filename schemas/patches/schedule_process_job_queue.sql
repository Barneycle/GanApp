-- Parallel backend workers for job_queue.
-- Each INSERT immediately invokes process-job-queue with that job_id so
-- thousands of certificate requests run concurrently instead of one-at-a-time
-- in a browser tab. Cron remains as a drain for retries / missed webhooks.
--
-- Prerequisites (same as before):
--   Deploy process-job-queue, set CRON_SECRET + SITE_URL, store
--   job_queue_cron_secret in Vault.
--
-- Run this file in the Supabase SQL editor (safe to re-run).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

GRANT EXECUTE ON FUNCTION get_next_job() TO service_role;
GRANT EXECUTE ON FUNCTION complete_job(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION fail_job(UUID, TEXT) TO service_role;

DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION get_next_certificate_number(UUID) TO service_role';
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'get_next_certificate_number not found; run create_certificate_counter_table.sql for certificate jobs';
END $$;

CREATE OR REPLACE FUNCTION claim_job(p_job_id UUID)
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
  v_current_attempts INTEGER;
  v_stale_after INTERVAL := INTERVAL '2 minutes';
BEGIN
  SELECT job_queue.attempts INTO v_current_attempts
  FROM job_queue
  WHERE job_queue.id = p_job_id
    AND (
      job_queue.status = 'pending'
      OR (
        job_queue.status = 'processing'
        AND job_queue.started_at IS NOT NULL
        AND job_queue.started_at < NOW() - v_stale_after
        AND job_queue.attempts < job_queue.max_attempts
      )
    )
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE job_queue
  SET status = 'processing',
      started_at = NOW(),
      attempts = v_current_attempts + 1
  WHERE job_queue.id = p_job_id;

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
  WHERE j.id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION claim_job(UUID) TO service_role;

DROP FUNCTION IF EXISTS invoke_process_job_queue();
DROP FUNCTION IF EXISTS invoke_process_job_queue(UUID);

CREATE OR REPLACE FUNCTION invoke_process_job_queue(p_job_id UUID DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  v_secret text;
  v_request_id bigint;
  v_url text := 'https://hekjabrlgdpbffzidshz.supabase.co/functions/v1/process-job-queue';
  v_body jsonb;
BEGIN
  SELECT decrypted_secret
    INTO v_secret
    FROM vault.decrypted_secrets
   WHERE name = 'job_queue_cron_secret'
   LIMIT 1;

  IF v_secret IS NULL OR btrim(v_secret) = '' THEN
    RAISE WARNING 'invoke_process_job_queue: vault secret job_queue_cron_secret is missing';
    RETURN NULL;
  END IF;

  v_body := CASE
    WHEN p_job_id IS NULL THEN '{}'::jsonb
    ELSE jsonb_build_object('job_id', p_job_id)
  END;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := v_body
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION invoke_process_job_queue(UUID) TO postgres;

CREATE OR REPLACE FUNCTION job_queue_wakeup_worker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM invoke_process_job_queue(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_queue_wakeup ON job_queue;
CREATE TRIGGER trg_job_queue_wakeup
  AFTER INSERT ON job_queue
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE PROCEDURE job_queue_wakeup_worker();

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  FOR v_jobid IN SELECT jobid FROM cron.job WHERE jobname = 'process-job-queue'
  LOOP
    PERFORM cron.unschedule(v_jobid);
  END LOOP;
END $$;

-- Drain retries / missed webhooks. One job per invoke so the function stays under timeout.
SELECT cron.schedule(
  'process-job-queue',
  '* * * * *',
  $$SELECT invoke_process_job_queue()$$
);
