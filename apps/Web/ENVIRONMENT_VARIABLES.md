# Environment Variables Documentation

This document describes all environment variables used in the GanApp web application.

## Quick Start

1. Copy `.env.example` to `.env.local`
2. Fill in the required variables (Supabase)
3. Optionally configure email and Redis for production features

## Variable Reference

### Required Variables

#### `VITE_SUPABASE_URL`
- **Type**: String (URL)
- **Required**: Yes
- **Description**: Your Supabase project URL
- **Example**: `https://hekjabrlgdpbffzidshz.supabase.co`
- **Where to get it**: Supabase Dashboard → Settings → API → Project URL
- **Used in**: Database connection, authentication

#### `VITE_SUPABASE_ANON_KEY`
- **Type**: String
- **Required**: Yes
- **Description**: Supabase anonymous/public key (safe to expose in client)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to get it**: Supabase Dashboard → Settings → API → Project API keys → anon public
- **Used in**: Database connection, authentication
- **Security**: This is a public key - it's safe to expose in client-side code

---

### Optional Variables

#### `VITE_RESEND_API_KEY`
- **Type**: String
- **Required**: No (emails will be disabled if not set)
- **Description**: API key for Resend email service
- **Where to get it**: https://resend.com/api-keys
- **Used in**: `emailService.ts` - for sending emails (password reset, notifications, etc.)
- **Note**: If not set, email functionality will be disabled but app will continue to work

#### `VITE_RESEND_FROM_EMAIL`
- **Type**: String (Email address)
- **Required**: No (defaults to `noreply@ganapp.com`)
- **Description**: The "from" email address for sent emails
- **Example**: `noreply@yourdomain.com`
- **Note**: Must be verified in your Resend account

#### `VITE_UPSTASH_REDIS_URL`
- **Type**: String (URL)
- **Required**: No (uses in-memory cache if not set)
- **Description**: Upstash Redis instance URL for caching
- **Where to get it**: https://console.upstash.com/ → Your Redis Database → REST API → URL
- **Used in**: `cacheService.ts` - for production caching
- **Note**: Without this, the app uses in-memory caching (resets on page refresh)

#### `VITE_UPSTASH_REDIS_TOKEN`
- **Type**: String
- **Required**: No (only if using Redis)
- **Description**: Token for Upstash Redis authentication
- **Where to get it**: https://console.upstash.com/ → Your Redis Database → REST API → Token
- **Note**: Safe to use in client (token is scoped to your database)

#### `VITE_APP_ENV`
- **Type**: String
- **Required**: No (defaults to `development` in dev mode, `production` in build)
- **Description**: Application environment mode
- **Values**: `development` | `production`
- **Used in**: Logging service, feature flags
- **Note**: Usually set automatically by Vite based on build mode

#### `VITE_BASE_PATH`
- **Type**: String
- **Required**: No (defaults to `/`)
- **Description**: Base path for the application (for subdirectory deployments)
- **Example**: `/app` (if deploying to `https://example.com/app`)
- **Used in**: `vite.config.js` for routing

#### `VITE_SENTRY_DSN`
- **Type**: String (URL)
- **Required**: No (error tracking disabled if not set)
- **Description**: Sentry DSN (Data Source Name) for error tracking
- **Where to get it**: https://sentry.io → Your Project → Settings → Client Keys (DSN)
- **Used in**: `errorTrackingService.ts` - for production error tracking
- **Note**: Only used in production mode. Errors are tracked automatically when configured.

#### `VITE_APP_VERSION`
- **Type**: String
- **Required**: No
- **Description**: Application version for error tracking and release management
- **Example**: `1.0.0`, `v2.1.3`
- **Used in**: Error tracking service for release tracking
- **Note**: Useful for tracking which version introduced bugs

---

## Development vs Production

### Development
- Use `.env.local` file (not committed to git)
- Set `VITE_APP_ENV=development` (or let Vite handle it)
- Optional: Redis for testing caching
- Optional: Email service for testing emails

### Production (Vercel/Deployment)
- Set variables in your deployment platform (Vercel, Netlify, etc.)
- **Required**: Supabase URL and key
- **Recommended**: Redis for caching
- **Recommended**: Email service for user notifications
- Never commit `.env.local` to git

---

## Setting Up Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with its value
4. Select environments (Production, Preview, Development)
5. Redeploy your application

---

## Troubleshooting

### "Supabase URL not configured"
- Make sure `VITE_SUPABASE_URL` is set
- Check that it starts with `https://`
- Verify in Supabase dashboard

### "Email service not configured"
- This is a warning, not an error
- App will work without emails
- To enable: Set `VITE_RESEND_API_KEY`

### "Redis cache not available"
- App falls back to in-memory cache
- This is fine for development
- For production, set Upstash Redis variables

### Variables not loading
- Restart the development server after changing `.env.local`
- Make sure variable names start with `VITE_` (Vite requirement)
- Check for typos in variable names

---

## Security Notes

### Safe to Expose (Client-Side)
- `VITE_SUPABASE_ANON_KEY` - Public key with RLS policies
- `VITE_SUPABASE_URL` - Public endpoint
- `VITE_UPSTASH_REDIS_TOKEN` - Scoped token (read-only recommended)

### Never Expose
- Service role keys (server-side only)
- Private API keys without `VITE_` prefix
- Database passwords

---

## Related Documentation

- [Supabase Setup](https://supabase.com/docs)
- [Resend Setup](REDIS_SETUP_GUIDE.md)
- [Redis Setup](REDIS_SETUP_GUIDE.md)
- [Vercel Environment Variables](VERCEL_ENV_SETUP.md)

