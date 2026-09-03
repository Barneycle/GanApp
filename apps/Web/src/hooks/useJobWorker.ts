/**
 * Certificate and notification jobs are processed by the process-job-queue
 * Edge Function (insert webhook + cron drain). Do not claim jobs in the
 * browser — backgrounded tabs left rows stuck in "processing" and exhausted retries.
 */
export const useJobWorker = (_enabled: boolean = true, _intervalMs: number = 5000) => {
  // Backend worker only.
};
