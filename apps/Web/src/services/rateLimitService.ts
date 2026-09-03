/**
 * Rate Limiting Service
 * Prevents abuse and ensures fair resource usage
 */

import { supabase } from '../lib/supabaseClient';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  limit: number;
}

export class RateLimitService {
  /**
   * Check rate limit for a user or IP
   * @param identifier - User ID or IP address
   * @param endpoint - API endpoint or action name
   * @param maxRequests - Maximum requests per window (default: 60)
   * @param windowSeconds - Time window in seconds (default: 60)
   */
  static async checkRateLimit(
    identifier: string,
    endpoint: string,
    maxRequests: number = 60,
    windowSeconds: number = 60
  ): Promise<RateLimitResult> {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_identifier: identifier,
        p_endpoint: endpoint,
        p_max_requests: maxRequests,
        p_window_seconds: windowSeconds,
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // Fail open - allow request if rate limit check fails
        return {
          allowed: true,
          remaining: maxRequests,
          resetAt: new Date(Date.now() + windowSeconds * 1000).toISOString(),
          limit: maxRequests,
        };
      }

      return data as RateLimitResult;
    } catch (err) {
      console.error('Rate limit check exception:', err);
      // Fail open
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: new Date(Date.now() + windowSeconds * 1000).toISOString(),
        limit: maxRequests,
      };
    }
  }

  /**
   * Rate limit configurations for different endpoints
   */
  static limits = {
    // Authentication endpoints
    login: { maxRequests: 5, windowSeconds: 300 }, // 5 attempts per 5 minutes
    registration: { maxRequests: 3, windowSeconds: 3600 }, // 3 per hour
    passwordReset: { maxRequests: 3, windowSeconds: 3600 }, // 3 per hour
    
    // API endpoints
    eventsList: { maxRequests: 100, windowSeconds: 60 }, // 100 per minute
    eventCreate: { maxRequests: 10, windowSeconds: 3600 }, // 10 per hour
    certificateGenerate: { maxRequests: 5, windowSeconds: 300 }, // 5 per 5 minutes
    fileUpload: { maxRequests: 20, windowSeconds: 60 }, // 20 per minute
    
    // Search endpoints
    search: { maxRequests: 60, windowSeconds: 60 }, // 60 per minute
    
    // Verification endpoints (public)
    certificateVerify: { maxRequests: 100, windowSeconds: 60 }, // 100 per minute
  };

  /**
   * Get client identifier (user ID or IP)
   */
  static getIdentifier(userId?: string, ipAddress?: string): string {
    return userId || ipAddress || 'anonymous';
  }
}

