# Background Job Queue Setup Guide

## Overview

Certificate generation runs on a **backend worker**, not in the browser.

1. Inserting a `job_queue` row fires a Postgres trigger that POSTs to the `process-job-queue` Edge Function with that `job_id`.
2. The function **claims that one job** (`claim_job` / `FOR UPDATE SKIP LOCKED`) and renders it. Many inserts = many parallel invocations.
3. pg_cron still runs once a minute to drain retries or any job whose webhook was missed.

The browser only queues the job and polls status. It does not claim or render certificates.

## Setup Steps

### Step 1: Run SQL Migration

Run the SQL file in your Supabase SQL Editor:

```sql
-- Run: create_job_queue_table.sql
-- Also run: fix_stale_job_reclaim.sql and fix_atomic_certificate_number.sql if not already applied
```

This creates:
- `job_queue` table
- Database functions for job management
- RLS policies

### Step 2: Deploy the backend worker

1. Deploy the function (from the repo root, logged into the Supabase CLI):

```bash
npx supabase functions deploy process-job-queue --no-verify-jwt --project-ref hekjabrlgdpbffzidshz
```

2. Secrets (if not already set):

```bash
npx supabase secrets set CRON_SECRET=<your-existing-secret> --project-ref hekjabrlgdpbffzidshz
npx supabase secrets set SITE_URL=https://gan-app-nu.vercel.app --project-ref hekjabrlgdpbffzidshz
```

3. Store the **same** `CRON_SECRET` in Vault if you have not already:

```sql
SELECT vault.create_secret('<your-existing-secret>', 'job_queue_cron_secret');
```

4. Enable the insert webhook + cron drain:

```sql
-- Run: schemas/patches/schedule_process_job_queue.sql
```

5. Confirm:

```sql
SELECT * FROM cron.job WHERE jobname = 'process-job-queue';
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_job_queue_wakeup';
```

Each queued certificate should start within about a second. Cron is only a fallback.

### Step 3: Verify Setup

1. **Check trigger**: `SELECT tgname FROM pg_trigger WHERE tgname = 'trg_job_queue_wakeup';`
2. **Test**: Queue several certificates with every tab closed
3. **Monitor**: `SELECT id, status, attempts, error_message FROM job_queue ORDER BY created_at DESC LIMIT 20;`
4. Jobs should move to `completed` in a few seconds each, in parallel — not one after another

---

## How It Works

### Certificate Generation Flow:

1. **User clicks "Generate Certificate"**
   - Job is inserted (`pending`)
   - Trigger POSTs to `process-job-queue` with `job_id`

2. **Edge Function claims that job**
   - `claim_job(job_id)` (`FOR UPDATE SKIP LOCKED`)
   - Renders PNG/PDF on the server (no browser canvas)
   - Uploads files and saves the certificate row

3. **Job completes**
   - Status: `completed`
   - UI poll sees it within about a second

### Job Statuses:

- `pending` - Waiting to be processed
- `processing` - Currently being processed
- `completed` - Successfully completed
- `failed` - Failed after max attempts

---

## Configuration

### Worker Interval

Adjust how often jobs are processed:

```typescript
// Process jobs every 5 seconds (faster)
useJobWorker(true, 5000);

// Process jobs every 30 seconds (slower, less load)
useJobWorker(true, 30000);
```

### Job Priority

When queuing jobs, set priority (1 = highest, 10 = lowest):

```typescript
// High priority job
await JobQueueService.queueCertificateGeneration(data, userId, 1);

// Normal priority (default)
await JobQueueService.queueCertificateGeneration(data, userId, 5);

// Low priority
await JobQueueService.queueCertificateGeneration(data, userId, 10);
```

### Max Attempts

Jobs retry automatically on failure. Default: 3 attempts.

To change, update the SQL function or set when creating job:

```sql
-- In create_job_queue_table.sql, change:
max_attempts INTEGER DEFAULT 3
```

---

## Monitoring Jobs

### View All Jobs:

```sql
SELECT * FROM job_queue ORDER BY created_at DESC LIMIT 50;
```

### View Pending Jobs:

```sql
SELECT * FROM job_queue WHERE status = 'pending' ORDER BY priority ASC, created_at ASC;
```

### View Failed Jobs:

```sql
SELECT * FROM job_queue WHERE status = 'failed' ORDER BY created_at DESC;
```

### View User's Jobs:

```typescript
const { jobs } = await JobQueueService.getUserJobs(userId);
```

---

## Troubleshooting

### Jobs Not Processing?

1. **Check insert trigger**: `SELECT tgname FROM pg_trigger WHERE tgname = 'trg_job_queue_wakeup';`
2. **Check Vault**: secret `job_queue_cron_secret` must match function secret `CRON_SECRET`
3. **Check Edge logs**: Dashboard → Edge Functions → process-job-queue
4. **Redeploy** after pulling these changes: `npx supabase functions deploy process-job-queue --no-verify-jwt --project-ref hekjabrlgdpbffzidshz`
5. **Check cron drain**: `SELECT * FROM cron.job WHERE jobname = 'process-job-queue';`

### Jobs Failing?

1. **Check Error Messages**: 
   ```sql
   SELECT error_message FROM job_queue WHERE status = 'failed';
   ```

2. **Check Certificate Config**: Ensure certificate config exists for event
3. **Check Permissions**: Verify user has permission to generate certificates

### Jobs Stuck in Processing?

`claim_job` / `get_next_job` reclaim rows stuck in processing for more than 2 minutes. To reset sooner:

```sql
UPDATE job_queue 
SET status = 'pending', started_at = NULL 
WHERE status = 'processing' 
AND started_at < NOW() - INTERVAL '2 minutes';
```

---

## Parallelism

Each `job_queue` insert starts its own Edge Function invocation. `claim_job(p_job_id)` uses `FOR UPDATE SKIP LOCKED` so two invocations never render the same row. Cron calls `get_next_job()` with the same lock semantics to drain leftovers.

---

## Next Steps

1. Deploy `process-job-queue`
2. Re-run `schemas/patches/schedule_process_job_queue.sql` (adds the insert webhook)
3. Queue several certificates with every tab closed — they should complete in parallel

Your job queue is now ready! 🚀

