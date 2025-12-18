/**
 * PerformanceService - Performance monitoring and metrics tracking
 * 
 * Tracks application performance metrics including:
 * - API response times
 * - Database query performance
 * - Operation durations
 * - Slow operation detection (>1 second)
 * 
 * Usage:
 * ```typescript
 * import { PerformanceService } from './services/performanceService';
 * 
 * const timer = PerformanceService.startTimer('operation-name');
 * // ... do work ...
 * PerformanceService.endTimer(timer, { additional: 'context' });
 * ```
 */

import { LoggerService } from './loggerService';

export interface PerformanceMetric {
  operation: string;
  duration: number; // milliseconds
  timestamp: number;
  context?: Record<string, any>;
  isSlow?: boolean; // true if duration > 1000ms
}

export interface PerformanceTimer {
  operation: string;
  startTime: number;
  context?: Record<string, any>;
}

export class PerformanceService {
  private static metrics: PerformanceMetric[] = [];
  private static readonly MAX_METRICS = 1000; // Keep last 1000 metrics in memory
  private static readonly SLOW_OPERATION_THRESHOLD = 1000; // 1 second in milliseconds
  private static readonly ENABLED = import.meta.env.MODE === 'development' || import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true';

  /**
   * Start a performance timer for an operation
   */
  static startTimer(operation: string, context?: Record<string, any>): PerformanceTimer {
    if (!this.ENABLED) {
      return { operation, startTime: 0 };
    }

    return {
      operation,
      startTime: performance.now(),
      context,
    };
  }

  /**
   * End a performance timer and record the metric
   */
  static endTimer(timer: PerformanceTimer, additionalContext?: Record<string, any>): number {
    if (!this.ENABLED || timer.startTime === 0) {
      return 0;
    }

    const duration = performance.now() - timer.startTime;
    const isSlow = duration > this.SLOW_OPERATION_THRESHOLD;

    const metric: PerformanceMetric = {
      operation: timer.operation,
      duration,
      timestamp: Date.now(),
      context: { ...timer.context, ...additionalContext },
      isSlow,
    };

    this.recordMetric(metric);

    // Log slow operations
    if (isSlow) {
      LoggerService.serviceWarn('PerformanceService', `Slow operation detected: ${timer.operation}`, {
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${this.SLOW_OPERATION_THRESHOLD}ms`,
        ...metric.context,
      });
    }

    return duration;
  }

  /**
   * Record a performance metric
   */
  private static recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the last MAX_METRICS
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // In development, log all metrics
    if (import.meta.env.MODE === 'development') {
      LoggerService.debug(`Performance: ${metric.operation}`, {
        duration: `${metric.duration.toFixed(2)}ms`,
        ...metric.context,
      });
    }
  }

  /**
   * Measure an async operation
   */
  static async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const timer = this.startTimer(operation, context);
    try {
      const result = await fn();
      this.endTimer(timer);
      return result;
    } catch (error) {
      this.endTimer(timer, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Measure a synchronous operation
   */
  static measureSync<T>(
    operation: string,
    fn: () => T,
    context?: Record<string, any>
  ): T {
    const timer = this.startTimer(operation, context);
    try {
      const result = fn();
      this.endTimer(timer);
      return result;
    } catch (error) {
      this.endTimer(timer, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get performance metrics for an operation
   */
  static getMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return [...this.metrics];
  }

  /**
   * Get slow operations (>threshold)
   */
  static getSlowOperations(): PerformanceMetric[] {
    return this.metrics.filter(m => m.isSlow);
  }

  /**
   * Get average duration for an operation
   */
  static getAverageDuration(operation: string): number {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    if (operationMetrics.length === 0) {
      return 0;
    }

    const sum = operationMetrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / operationMetrics.length;
  }

  /**
   * Get performance statistics for an operation
   */
  static getStats(operation: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    slowCount: number;
  } {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    if (operationMetrics.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, slowCount: 0 };
    }

    const durations = operationMetrics.map(m => m.duration);
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const average = sum / durations.length;
    const slowCount = operationMetrics.filter(m => m.isSlow).length;

    return {
      count: operationMetrics.length,
      average,
      min,
      max,
      slowCount,
    };
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get summary of all operations
   */
  static getSummary(): Record<string, {
    count: number;
    average: number;
    min: number;
    max: number;
    slowCount: number;
  }> {
    const operations = new Set(this.metrics.map(m => m.operation));
    const summary: Record<string, any> = {};

    for (const operation of operations) {
      summary[operation] = this.getStats(operation);
    }

    return summary;
  }

  /**
   * Export metrics as JSON (for debugging/analysis)
   */
  static exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      summary: this.getSummary(),
    }, null, 2);
  }
}

