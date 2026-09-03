/**
 * Cache Service for Redis/Upstash
 * Provides caching layer to reduce database load and improve performance
 */

// Simple in-memory cache fallback (for development)
// Replace with Redis/Upstash in production
class MemoryCache {
  private cache: Map<string, { value: any; expires: number }> = new Map();

  async get(key: string): Promise<any | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    const expires = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expires });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

export class CacheService {
  private static cache: MemoryCache = new MemoryCache();
  private static redis: any = null;
  private static redisInitialized: boolean = false;

  // Initialize Redis if available (lazy initialization)
  private static async initRedis() {
    // Only initialize once
    if (this.redisInitialized) {
      return;
    }

    this.redisInitialized = true;

    // Check if Redis environment variables are set
    if (!import.meta.env.VITE_UPSTASH_REDIS_URL || !import.meta.env.VITE_UPSTASH_REDIS_TOKEN) {
      return; // Redis not configured, use memory cache
    }

    try {
      // Dynamic import - only if package is installed
      const redisModule = await import('@upstash/redis');
      const { Redis } = redisModule;
      
      this.redis = new Redis({
        url: import.meta.env.VITE_UPSTASH_REDIS_URL,
        token: import.meta.env.VITE_UPSTASH_REDIS_TOKEN,
      });
      
      const { LoggerService } = await import('./loggerService');
      LoggerService.log('Redis cache initialized');
    } catch (error: any) {
      // Package not installed or initialization failed
      const { LoggerService } = await import('./loggerService');
      if (error.message?.includes('Failed to resolve') || error.message?.includes('Cannot find module')) {
        LoggerService.log('@upstash/redis not installed. Install it to use Redis cache: npm install @upstash/redis');
      } else {
        LoggerService.warn('Failed to initialize Redis, using memory cache', { message: error.message });
      }
      this.redis = null;
    }
  }

  /**
   * Get cached value
   */
  static async get<T = any>(key: string): Promise<T | null> {
    try {
      // Initialize Redis if not already done
      await this.initRedis();

      // Use Redis if available, otherwise use memory cache
      if (this.redis) {
        try {
          const value = await this.redis.get<T>(key);
          return value;
        } catch (redisError) {
          const { LoggerService } = await import('./loggerService');
          LoggerService.warn('Redis get error, falling back to memory cache', { error: redisError });
          // Fall back to memory cache
        }
      }
      
      return await this.cache.get(key);
    } catch (error) {
      const { LoggerService } = await import('./loggerService');
      LoggerService.error('Cache get error', error);
      return null;
    }
  }

  /**
   * Set cached value with TTL (time to live in seconds)
   */
  static async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      // Initialize Redis if not already done
      await this.initRedis();

      if (this.redis) {
        try {
          await this.redis.set(key, value, { ex: ttl });
          return;
        } catch (redisError) {
          const { LoggerService } = await import('./loggerService');
          LoggerService.warn('Redis set error, falling back to memory cache', { error: redisError });
          // Fall back to memory cache
        }
      }
      
      await this.cache.set(key, value, ttl);
    } catch (error) {
      const { LoggerService } = await import('./loggerService');
      LoggerService.error('Cache set error', error);
    }
  }

  /**
   * Delete cached value
   */
  static async delete(key: string): Promise<void> {
    try {
      // Initialize Redis if not already done
      await this.initRedis();

      if (this.redis) {
        try {
          await this.redis.del(key);
          return;
        } catch (redisError) {
          const { LoggerService } = await import('./loggerService');
          LoggerService.warn('Redis delete error, falling back to memory cache', { error: redisError });
          // Fall back to memory cache
        }
      }
      
      await this.cache.delete(key);
    } catch (error) {
      const { LoggerService } = await import('./loggerService');
      LoggerService.error('Cache delete error', error);
    }
  }

  /**
   * Delete all keys matching pattern (e.g., "events:*")
   */
  static async deletePattern(pattern: string): Promise<void> {
    try {
      // Initialize Redis if not already done
      await this.initRedis();

      if (this.redis) {
        try {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
          return;
        } catch (redisError) {
          const { LoggerService } = await import('./loggerService');
          LoggerService.warn('Redis deletePattern error, falling back to memory cache', { error: redisError });
          // Fall back to memory cache
        }
      }
      
      await this.cache.deletePattern(pattern);
    } catch (error) {
      const { LoggerService } = await import('./loggerService');
      LoggerService.error('Cache deletePattern error', error);
    }
  }

  /**
   * Clear all cache
   */
  static async clear(): Promise<void> {
    try {
      // if (this.redis) {
      //   // Redis doesn't have a clear all, use FLUSHDB in production carefully
      //   return;
      // }
      
      await this.cache.clear();
    } catch (error) {
      const { LoggerService } = await import('./loggerService');
      LoggerService.error('Cache clear error', error);
    }
  }

  /**
   * Cache key generators
   */
  static keys = {
    user: (userId: string) => `user:${userId}`,
    userProfile: (userId: string) => `user:profile:${userId}`,
    event: (eventId: string) => `event:${eventId}`,
    events: (filters?: string) => `events:${filters || 'all'}`,
    eventList: (role: string, userId?: string) => `events:list:${role}:${userId || 'all'}`,
    certificateConfig: (eventId: string) => `cert:config:${eventId}`,
    certificate: (certNumber: string) => `cert:${certNumber}`,
    survey: (surveyId: string) => `survey:${surveyId}`,
    systemSettings: () => 'system:settings',
  };

  /**
   * Cache TTL constants (in seconds)
   */
  static TTL = {
    SHORT: 300,      // 5 minutes
    MEDIUM: 1800,    // 30 minutes
    LONG: 3600,      // 1 hour
    VERY_LONG: 86400, // 24 hours
  };
}

