/**
 * Error Tracking Service - Wrapper for Sentry
 * 
 * Provides error tracking integration with Sentry. Gracefully handles
 * cases where Sentry is not configured or unavailable.
 * 
 * Usage:
 * ```typescript
 * import { ErrorTrackingService } from './services/errorTrackingService';
 * 
 * ErrorTrackingService.captureException(error, { userId: '123', action: 'create_event' });
 * ErrorTrackingService.setUser({ id: '123', email: 'user@example.com' });
 * ```
 */

interface ErrorContext {
  [key: string]: any;
}

interface UserContext {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: any;
}

class ErrorTrackingService {
  private static sentry: any = null;
  private static initialized: boolean = false;

  /**
   * Initialize error tracking (call once at app startup)
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    // Only initialize in production
    const isProduction = import.meta.env.MODE === 'production';
    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

    if (!isProduction || !sentryDsn) {
      // Sentry not configured - that's okay, we'll just skip it
      return;
    }

    try {
      // Dynamic import - only load Sentry if configured
      // Use a variable to make the import path dynamic and avoid Vite static analysis
      // This allows the app to work without @sentry/react installed
      const sentryPackage = '@sentry/react';
      const SentryModule = await import(/* @vite-ignore */ sentryPackage);
      const { init, captureException: sentryCaptureException, setUser: sentrySetUser, setContext: sentrySetContext } = SentryModule;

      // Initialize Sentry
      init({
        dsn: sentryDsn,
        environment: import.meta.env.MODE,
        integrations: [
          // Browser tracing integration for performance monitoring
          // Check if browserTracingIntegration exists (it might not in older versions)
          SentryModule.browserTracingIntegration ? SentryModule.browserTracingIntegration() : undefined,
        ].filter(Boolean),
        // Performance Monitoring
        tracesSampleRate: 0.1, // 10% of transactions (adjust based on traffic)
        // Session Replay (optional - can be enabled later)
        // replaysSessionSampleRate: 0.1,
        // replaysOnErrorSampleRate: 1.0,
        // Release tracking
        release: import.meta.env.VITE_APP_VERSION || undefined,
        // Filter out common non-critical errors
        beforeSend(event, hint) {
          // Filter out network errors (common and usually not actionable)
          if (event.exception) {
            const error = hint.originalException;
            if (error && typeof error === 'object' && 'message' in error) {
              const message = String(error.message).toLowerCase();
              if (message.includes('network') || message.includes('fetch')) {
                return null; // Don't send to Sentry
              }
            }
          }
          return event;
        },
      });

      // Store Sentry functions for later use
      this.sentry = {
        captureException: sentryCaptureException,
        setUser: sentrySetUser,
        setContext: sentrySetContext,
      };

      const { LoggerService } = await import('./loggerService');
      LoggerService.log('Sentry error tracking initialized');
    } catch (error: any) {
      // Sentry package not installed or initialization failed
      // That's okay - we'll just skip error tracking
      const { LoggerService } = await import('./loggerService');
      if (error.message?.includes('Failed to resolve') || error.message?.includes('Cannot find module')) {
        LoggerService.debug('@sentry/react not installed. Install it to enable error tracking: npm install @sentry/react');
      } else {
        LoggerService.warn('Failed to initialize Sentry, error tracking disabled', { error: error.message });
      }
      this.sentry = null;
    }
  }

  /**
   * Capture an exception/error
   */
  static captureException(error: any, context?: ErrorContext): void {
    if (!this.sentry) {
      return; // Sentry not initialized
    }

    try {
      // Add context if provided
      if (context && Object.keys(context).length > 0) {
        this.sentry.setContext('error_context', context);
      }

      this.sentry.captureException(error, {
        tags: {
          service: context?.serviceName || 'unknown',
        },
        extra: context,
      });
    } catch (err) {
      // Fail silently - don't break the app if error tracking fails
      console.error('Failed to capture exception in Sentry:', err);
    }
  }

  /**
   * Set user context for error tracking
   */
  static setUser(user: UserContext | null): void {
    if (!this.sentry) {
      return; // Sentry not initialized
    }

    try {
      this.sentry.setUser(user);
    } catch (err) {
      // Fail silently
      console.error('Failed to set user in Sentry:', err);
    }
  }

  /**
   * Set additional context
   */
  static setContext(key: string, context: any): void {
    if (!this.sentry) {
      return; // Sentry not initialized
    }

    try {
      this.sentry.setContext(key, context);
    } catch (err) {
      // Fail silently
      console.error('Failed to set context in Sentry:', err);
    }
  }

  /**
   * Check if error tracking is enabled
   */
  static isEnabled(): boolean {
    return this.sentry !== null;
  }
}

export { ErrorTrackingService };

