# Redis Setup Guide (Upstash)

## Quick Setup

### Step 1: Sign Up for Upstash Redis

1. Go to [https://upstash.com](https://upstash.com)
2. Sign up for a free account
3. Create a new Redis database
4. Choose a region close to your users
5. Copy your Redis URL and Token

### Step 2: Install Upstash Redis Package

```bash
cd apps/Web
npm install @upstash/redis
```

### Step 3: Add Environment Variables

Add to your `.env.local` file:

```env
VITE_UPSTASH_REDIS_URL=https://your-redis-url.upstash.io
VITE_UPSTASH_REDIS_TOKEN=your-redis-token
```

**Important**: 
- These are public environment variables (VITE_ prefix)
- Upstash uses token-based authentication (secure)
- The token is scoped to your Redis database

### Step 4: Initialize Redis Cache

The cache service will automatically detect Redis when environment variables are set.

To manually initialize (optional):

```typescript
import { CacheService } from './services/cacheService';

// Initialize Redis (called automatically on first use)
await CacheService.initRedis();
```

### Step 5: Verify Setup

Check browser console for:
- `Redis cache initialized` - Success!
- `Failed to initialize Redis, using memory cache` - Check your environment variables

---

## Upstash Free Tier Limits

- **10,000 commands per day**
- **256 MB storage**
- **Regional latency** (choose region close to users)

**For most applications, this is sufficient!**

---

## Production Considerations

### When to Upgrade:

1. **High Traffic**: > 10K cache operations/day
2. **Large Data**: > 256 MB cached data
3. **Global Users**: Need multi-region replication

### Upstash Pricing:

- **Free**: 10K commands/day, 256 MB
- **Pay-as-you-go**: $0.20 per 100K commands
- **Pro**: $10/month for 1M commands/day

---

## Troubleshooting

### Redis Not Working?

1. **Check Environment Variables**:
   ```bash
   echo $VITE_UPSTASH_REDIS_URL
   echo $VITE_UPSTASH_REDIS_TOKEN
   ```

2. **Check Browser Console**: Look for Redis initialization messages

3. **Verify Upstash Dashboard**: Check if database is active

4. **Test Connection**:
   ```typescript
   import { CacheService } from './services/cacheService';
   await CacheService.initRedis();
   await CacheService.set('test', 'value', 60);
   const value = await CacheService.get('test');
   console.log('Redis test:', value); // Should print 'value'
   ```

### Fallback Behavior

If Redis fails to initialize, the system automatically falls back to:
- **In-memory cache** (development)
- **No cache** (if memory cache fails)

This ensures your application never crashes due to cache issues.

---

## Security Notes

1. **Token Security**: Upstash tokens are scoped to your database
2. **Public Variables**: VITE_ prefix makes variables public (safe for Redis tokens)
3. **RLS**: Upstash uses token-based auth (more secure than passwords)

---

## Monitoring

### Upstash Dashboard:

- View command usage
- Monitor latency
- Check storage usage
- View logs

### Application Monitoring:

Check browser console for:
- Cache hit/miss rates
- Redis errors (if any)
- Fallback to memory cache

---

## Next Steps

1. ✅ Set up Upstash Redis
2. ✅ Add environment variables
3. ✅ Install package
4. ✅ Test cache functionality
5. ✅ Monitor usage in Upstash dashboard

Your Redis cache is now ready! 🚀

