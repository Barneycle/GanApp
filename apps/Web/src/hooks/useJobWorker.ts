/**
 * Job Worker Hook
 * Processes background jobs periodically
 * Call this hook in your main App component or a dedicated worker component
 */

import { useEffect, useRef } from 'react';
import { CertificateJobProcessor } from '../services/certificateJobProcessor';

export const useJobWorker = (enabled: boolean = true, intervalMs: number = 10000) => {
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
        const result = await CertificateJobProcessor.processPendingJobs();
        if (result.processed > 0) {
          console.log(`Processed ${result.processed} jobs: ${result.succeeded} succeeded, ${result.failed} failed`);
        }
      } catch (error) {
        console.error('Job processing error:', error);
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Process jobs immediately
    processJobs();

    // Then process every interval
    intervalRef.current = setInterval(processJobs, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, intervalMs]);
};

