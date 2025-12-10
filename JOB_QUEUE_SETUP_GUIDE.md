# Background Job Queue Setup Guide

## Overview

The job queue system processes heavy operations (like certificate generation) in the background, preventing the main application from blocking.

## Setup Steps

### Step 1: Run SQL Migration

Run the SQL file in your Supabase SQL Editor:

```sql
-- Run: create_job_queue_table.sql
```

This creates:
- `job_queue` table
- Database functions for job management
- RLS policies

### Step 2: Start Job Worker

Add the job worker hook to your main App component:

```typescript
// In apps/Web/src/App.jsx or apps/Web/src/main.jsx

import { useJobWorker } from './hooks/useJobWorker';

function App() {
  // Start job worker (processes jobs every 10 seconds)
  useJobWorker(true, 10000);
  
  // ... rest of your app
}
```

### Step 3: Verify Setup

1. **Check Database**: Verify `job_queue` table exists
2. **Test Job Creation**: Generate a certificate (should queue instead of generating immediately)
3. **Monitor Jobs**: Check `job_queue` table for job status

---

## How It Works

### Certificate Generation Flow:

1. **User clicks "Generate Certificate"**
   - Job is queued (status: `pending`)
   - User sees "Processing in background..." message

2. **Job Worker picks up job**
   - Worker calls `get_next_job()` function
   - Job status changes to `processing`
   - Certificate is generated

3. **Job completes**
   - Certificate files uploaded
   - Database record created
   - Job status: `completed`
   - User sees success notification

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

1. **Check Worker**: Ensure `useJobWorker` is called in App component
2. **Check Database**: Verify `job_queue` table exists
3. **Check Functions**: Verify `get_next_job()` function exists
4. **Check Console**: Look for job processing logs

### Jobs Failing?

1. **Check Error Messages**: 
   ```sql
   SELECT error_message FROM job_queue WHERE status = 'failed';
   ```

2. **Check Certificate Config**: Ensure certificate config exists for event
3. **Check Permissions**: Verify user has permission to generate certificates

### Jobs Stuck in Processing?

Jobs can get stuck if the worker crashes. To reset:

```sql
-- Reset stuck jobs (older than 5 minutes)
UPDATE job_queue 
SET status = 'pending', started_at = NULL 
WHERE status = 'processing' 
AND started_at < NOW() - INTERVAL '5 minutes';
```

---

## Advanced: Multiple Workers

For high-traffic applications, you can run multiple workers:

```typescript
// Worker 1: Process certificate jobs
useJobWorker(true, 10000);

// Worker 2: Process other job types
// (Create separate processor for different job types)
```

The `FOR UPDATE SKIP LOCKED` clause in `get_next_job()` ensures multiple workers don't pick the same job.

---

## Performance Tips

1. **Adjust Interval**: Faster interval = faster processing but more database load
2. **Batch Processing**: Process multiple jobs per cycle (already implemented: 10 jobs max)
3. **Priority System**: Use priorities to process important jobs first
4. **Monitor Queue Size**: Keep an eye on pending jobs count

---

## Next Steps

1. ✅ Run SQL migration
2. ✅ Add `useJobWorker` to App component
3. ✅ Test certificate generation
4. ✅ Monitor job queue
5. ✅ Adjust worker interval as needed

Your job queue is now ready! 🚀

