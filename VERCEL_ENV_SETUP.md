# Vercel Environment Variables Setup

## Redis Environment Variables (Optional)

If you want to use Redis caching in production, add these to Vercel:

### Step 1: Get Your Upstash Redis Credentials

1. Go to [Upstash Console](https://console.upstash.com/)
2. Select your Redis database
3. Copy:
   - **UPSTASH_REDIS_REST_URL** (or **VITE_UPSTASH_REDIS_URL**)
   - **UPSTASH_REDIS_REST_TOKEN** (or **VITE_UPSTASH_REDIS_TOKEN**)

### Step 2: Add to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:

```
VITE_UPSTASH_REDIS_URL = https://your-redis-url.upstash.io
VITE_UPSTASH_REDIS_TOKEN = your-redis-token-here
```

4. **Important**: Select **Production**, **Preview**, and **Development** environments
5. Click **Save**

### Step 3: Redeploy

After adding environment variables, redeploy your application:

```bash
# Or trigger a new deployment from Vercel dashboard
git push origin main
```

---

## Important Notes

### ✅ Safe to Add (Public Variables)

These variables use the `VITE_` prefix, which means they're:
- **Public** (exposed to client-side code)
- **Safe** for Redis tokens (Upstash uses token-based auth, scoped to your database)
- **Visible** in browser DevTools (this is expected)

### ⚠️ Do NOT Add These to Vercel

**Never add these to Vercel** (they're already configured):
- `VITE_SUPABASE_URL` - Already in your code
- `VITE_SUPABASE_ANON_KEY` - Already in your code
- `SUPABASE_SERVICE_ROLE_KEY` - Should stay secret (server-side only)

---

## Current Environment Variables

### Already Configured (in code):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Optional (add to Vercel if using Redis):
- `VITE_UPSTASH_REDIS_URL` - Upstash Redis URL
- `VITE_UPSTASH_REDIS_TOKEN` - Upstash Redis token

---

## Testing in Production

After adding Redis variables to Vercel:

1. **Deploy** your application
2. **Check browser console** for:
   - `Redis cache initialized` ✅ (Redis working)
   - `@upstash/redis not installed` (Redis not installed, using memory cache)
3. **Monitor** Upstash dashboard for cache usage

---

## Fallback Behavior

If Redis variables are **not** added to Vercel:
- ✅ Application still works
- ✅ Uses in-memory cache (per user session)
- ✅ No errors or crashes
- ⚠️ Cache resets on page refresh (not shared across users)

---

## Recommendation

**For Production:**
- ✅ **Add Redis variables** if you want persistent, shared caching
- ✅ **Skip Redis** if you're okay with per-session caching (simpler)

**For Development:**
- Keep variables in `.env.local` (not committed to git)
- Redis is optional - app works fine without it

---

## Quick Checklist

- [ ] Sign up for Upstash Redis (free tier)
- [ ] Create Redis database
- [ ] Copy URL and Token
- [ ] Add to Vercel Environment Variables
- [ ] Redeploy application
- [ ] Verify Redis is working (check console)

---

## Cost

**Upstash Free Tier:**
- 10,000 commands per day
- 256 MB storage
- Perfect for most applications

**Upgrade when:**
- You exceed 10K commands/day
- You need more storage
- You need multi-region replication

