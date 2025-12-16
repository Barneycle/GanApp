/**
 * Job Worker Hook
 * Processes background jobs periodically
 * Call this hook in your main App component or a dedicated worker component
 */

import { useEffect, useRef } from 'react';
import { CertificateJobProcessor } from '../services/certificateJobProcessor';
import { NotificationJobProcessor } from '../services/notificationJobProcessor';

export const useJobWorker = (enabled: boolean = true, intervalMs: number = 5000) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const processJobs = async () => {
      // Prevent concurrent processing
      if (isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;
      try {
        // Process certificate jobs
        const certResult = await CertificateJobProcessor.processPendingJobs();
        if (certResult.processed > 0) {
          console.log(`Processed ${certResult.processed} certificate jobs: ${certResult.succeeded} succeeded, ${certResult.failed} failed`);
        }

        // Process notification jobs
        const notifResult = await NotificationJobProcessor.processPendingJobs();
        if (notifResult.processed > 0) {
          console.log(`Processed ${notifResult.processed} notification jobs: ${notifResult.succeeded} succeeded, ${notifResult.failed} failed`);
        }
      } catch (error) {
        console.error('Job processing error:', error);
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Process jobs immediately
    processJobs();

    // Then process every interval (reduced to 5 seconds for faster processing)
    intervalRef.current = setInterval(processJobs, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, intervalMs]);
};

