/**
 * LoggerService - Centralized logging service
 * 
 * Provides consistent logging across the application with environment-based
 * log levels. In development, logs to console. In production, can be extended
 * to send errors to error tracking services.
 * 
 * Usage:
 * ```typescript
 * import { LoggerService } from './services/loggerService';
 * 
 * LoggerService.log('Operation started', { userId: '123' });
 * LoggerService.error('Operation failed', error);
 * LoggerService.warn('Deprecated method used');
 * ```
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogContext {
  [key: string]: any;
}

export class LoggerService {
  private static isDevelopment = import.meta.env.MODE === 'development';
  private static isProduction = import.meta.env.MODE === 'production';
  private static logLevel: LogLevel = LoggerService.isDevelopment 
    ? LogLevel.DEBUG 
    : LogLevel.ERROR;

  /**
   * Log debug information (development only)
   */
  static debug(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.DEBUG && this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Log informational messages
   */
  static log(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.INFO) {
      if (this.isDevelopment) {
        console.log(`[INFO] ${message}`, context || '');
      }
      // In production, could send to logging service
    }
  }

  /**
   * Log warning messages
   */
  static warn(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, context || '');
      // In production, could send to monitoring service
    }
  }

  /**
   * Log error messages (always logged, even in production)
   */
  static error(message: string, error?: any, context?: LogContext): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error || '', context || '');
      
      // In production, send to error tracking service
      if (this.isProduction && error) {
        // Dynamically import to avoid circular dependencies
        import('./errorTrackingService').then(({ ErrorTrackingService }) => {
          ErrorTrackingService.captureException(error, {
            message,
            ...context,
          });
        }).catch(() => {
          // Error tracking not available - that's okay
        });
      }
    }
  }

  /**
   * Log service-specific messages with service name prefix
   */
  static serviceLog(serviceName: string, message: string, context?: LogContext): void {
    this.log(`[${serviceName}] ${message}`, context);
  }

  /**
   * Log service-specific errors with service name prefix
   */
  static serviceError(serviceName: string, message: string, error?: any, context?: LogContext): void {
    this.error(`[${serviceName}] ${message}`, error, {
      serviceName,
      ...context,
    });
  }

  /**
   * Log service-specific warnings with service name prefix
   */
  static serviceWarn(serviceName: string, message: string, context?: LogContext): void {
    this.warn(`[${serviceName}] ${message}`, context);
  }

  /**
   * Set log level (useful for testing or runtime configuration)
   */
  static setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get current log level
   */
  static getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Time an async operation and log the duration
   * Integrates with PerformanceService for metrics tracking
   */
  static async time<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const { PerformanceService } = await import('./performanceService');
    return PerformanceService.measure(operation, fn, context);
  }

  /**
   * Time a synchronous operation and log the duration
   * Integrates with PerformanceService for metrics tracking
   */
  static timeSync<T>(
    operation: string,
    fn: () => T,
    context?: LogContext
  ): T {
    // Dynamic import for sync operation
    const { PerformanceService } = require('./performanceService');
    return PerformanceService.measureSync(operation, fn, context);
  }

  /**
   * Start a performance timer
   * Returns a timer object that can be passed to endTimer
   */
  static async startTimer(operation: string, context?: LogContext): Promise<any> {
    const { PerformanceService } = await import('./performanceService');
    return PerformanceService.startTimer(operation, context);
  }

  /**
   * End a performance timer and log the duration
   */
  static async endTimer(timer: any, additionalContext?: LogContext): Promise<number> {
    const { PerformanceService } = await import('./performanceService');
    return PerformanceService.endTimer(timer, additionalContext);
  }
}

