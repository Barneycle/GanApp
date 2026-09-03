import { useEffect, useState } from 'react';

export const SPINNER_HIDDEN_MS = 1000;
export const SPINNER_PLAIN_MS = 2000;
export const SPINNER_STATIC_MS = 5000;
export const SPINNER_CHANGING_MS = 6000;

/**
 * < 1s: hidden
 * 2–5s: plain spinner
 * 5–6s: spinner + static text
 * 6s+: spinner + changing text
 */
export function useSpinnerPhase(active) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return undefined;
    }
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Date.now() - started), 150);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return 'idle';
  if (elapsed < SPINNER_PLAIN_MS) return 'hidden';
  if (elapsed < SPINNER_STATIC_MS) return 'plain';
  if (elapsed < SPINNER_CHANGING_MS) return 'static';
  return 'changing';
}
