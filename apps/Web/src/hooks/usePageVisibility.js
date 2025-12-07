import { useState, useEffect } from 'react';

/**
 * Custom hook to detect when the page/tab becomes visible or hidden
 * Returns true when the page is visible, false when hidden
 */
export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also listen for focus/blur events as fallback
    const handleFocus = () => setIsVisible(true);
    const handleBlur = () => setIsVisible(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return isVisible;
};

/**
 * Custom hook to pause/resume loading based on page visibility
 * Only runs the loading function when the page is visible
 */
export const useVisibleLoading = (loadingFunction, dependencies = []) => {
  const isVisible = usePageVisibility();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeLoading = async () => {
    // Don't start loading if page is not visible
    if (!isVisible) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await loadingFunction();
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('Loading error:', err);
    } finally {
      // Only set loading to false if page is still visible
      if (isVisible) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isVisible) {
      executeLoading();
    } else {
      // Pause loading when page becomes hidden
      setIsLoading(false);
    }
  }, [isVisible, ...dependencies]);

  return { isLoading, error, retry: executeLoading };
};


