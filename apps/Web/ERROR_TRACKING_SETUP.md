# Error Tracking Setup Guide

This guide explains how to set up Sentry error tracking for production monitoring.

## Overview

Error tracking has been integrated into the application using Sentry. When configured, all production errors are automatically captured with context (user, action, service name).

## Setup Instructions

### Step 1: Create Sentry Account

1. Go to https://sentry.io
2. Sign up for a free account (free tier: 5,000 events/month)
3. Create a new project
4. Select **React** as the platform

### Step 2: Get Your DSN

1. In Sentry dashboard, go to **Settings** → **Projects** → Your Project
2. Go to **Client Keys (DSN)**
3. Copy your DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### Step 3: Install Sentry Package

```bash
cd apps/Web
npm install @sentry/react
```

### Step 4: Configure Environment Variables

Add to your `.env.local` (development) or deployment platform (production):

```env
# Sentry Error Tracking (Production only)
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Optional: Application version for release tracking
VITE_APP_VERSION=1.0.0
```

**Important**: 
- Only set `VITE_SENTRY_DSN` in **production** environment
- Sentry will only initialize in production mode
- Development errors are logged to console only

### Step 5: Deploy

After deploying with the environment variable set, errors will automatically be tracked!

## How It Works

### Automatic Error Capture

All errors logged through `LoggerService` are automatically sent to Sentry:

```typescript
// This automatically sends to Sentry in production
LoggerService.serviceError('EventService', 'Failed to create event', error, {
  eventId: '123',
  userId: '456'
});
```

### User Context

User information is automatically tracked:
- When user logs in → Sentry user context is set
- When user logs out → Sentry user context is cleared
- Errors include user ID and email in Sentry dashboard

### Error Filtering

Common non-critical errors are filtered out:
- Network errors (fetch failures)
- Common browser errors

### Performance Monitoring

Sentry also tracks:
- Page load performance
- API response times
- Slow operations

## Viewing Errors

1. Go to https://sentry.io
2. Navigate to your project
3. View **Issues** tab for all errors
4. Click on an error to see:
   - Stack trace
   - User information
   - Browser/device info
   - Context (service name, action, etc.)
   - Frequency and affected users

## Testing

### Test Error Tracking (Production)

1. Deploy to production with `VITE_SENTRY_DSN` set
2. Trigger an error (e.g., try to access non-existent resource)
3. Check Sentry dashboard → Should see error within seconds

### Test Locally (Development)

Error tracking is **disabled** in development mode. To test:
1. Temporarily set `VITE_APP_ENV=production` in `.env.local`
2. Set `VITE_SENTRY_DSN`
3. Trigger an error
4. Check Sentry dashboard

**Note**: Remember to revert `VITE_APP_ENV` back to `development` after testing!

## Configuration

### Adjust Error Sampling

Edit `apps/Web/src/services/errorTrackingService.ts`:

```typescript
// Change tracesSampleRate (currently 10%)
tracesSampleRate: 0.1, // 10% of transactions
```

### Enable Session Replay (Optional)

Uncomment in `errorTrackingService.ts`:

```typescript
replaysSessionSampleRate: 0.1, // 10% of sessions
replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
```

### Custom Error Filtering

Edit `beforeSend` function in `errorTrackingService.ts` to filter specific errors.

## Troubleshooting

### Errors Not Appearing in Sentry?

1. **Check environment variable**: `VITE_SENTRY_DSN` must be set
2. **Check mode**: Must be production (`VITE_APP_ENV=production`)
3. **Check package**: `@sentry/react` must be installed
4. **Check browser console**: Look for Sentry initialization messages
5. **Check Sentry dashboard**: May take a few seconds to appear

### Too Many Errors?

- Adjust `tracesSampleRate` to reduce performance monitoring
- Add more filters in `beforeSend` function
- Check Sentry rate limits (free tier: 5,000 events/month)

### Errors in Development?

- This is expected! Error tracking is disabled in development
- Errors are logged to console only
- Set `VITE_APP_ENV=production` temporarily to test

## Best Practices

1. **Don't log sensitive data**: Passwords, tokens, etc. are filtered automatically
2. **Use meaningful context**: Include service name, action, resource ID
3. **Monitor regularly**: Check Sentry dashboard weekly
4. **Set up alerts**: Configure Sentry alerts for critical errors
5. **Review errors**: Fix high-frequency errors first

## Cost

- **Free Tier**: 5,000 events/month
- **Paid Plans**: Start at $26/month for more events
- **Recommendation**: Free tier is sufficient for most applications

## Next Steps

1. Set up Sentry account
2. Install package: `npm install @sentry/react`
3. Add `VITE_SENTRY_DSN` to production environment
4. Deploy and monitor errors!

