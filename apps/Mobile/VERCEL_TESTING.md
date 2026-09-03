# Testing with Vercel Deployment

To test the certificate WebView with your Vercel deployment instead of localhost:

## Quick Setup

### Option 1: Using Environment Variable (Recommended for Testing)

Create a `.env.local` file in the `apps/Mobile` directory (or update existing one):

```bash
EXPO_PUBLIC_WEB_APP_URL=https://gan-app-nu.vercel.app
```

**Important:** 
- No trailing slash needed (the code handles it automatically)
- Restart your Expo dev server after creating/updating the file
- Environment variables are loaded at startup

### Option 2: Build in Production Mode

When you build the app for production, it will automatically use the Vercel URL (`https://gan-app-nu.vercel.app`).

## Switching Between Local and Vercel

### To test with Vercel:
1. Create/update `.env.local` with: `EXPO_PUBLIC_WEB_APP_URL=https://gan-app-nu.vercel.app`
2. Restart Expo dev server

### To test with local dev server:
1. Remove or comment out `EXPO_PUBLIC_WEB_APP_URL` in `.env.local`
2. Or set it to your local URL: `EXPO_PUBLIC_WEB_APP_URL=http://10.0.2.2:5173` (Android emulator)
3. Restart Expo dev server

## Verify It's Working

Check the console logs when opening the certificate screen. You should see:
```
🌐 WebView URL: https://gan-app-nu.vercel.app/certificate?eventId=...&mobile=true&token=...
```

If you see `http://10.0.2.2:5173` or `http://localhost:5173`, the environment variable isn't being picked up - make sure to restart the Expo server.

## Notes

- The Vercel URL is already configured in the code as the production fallback
- Environment variables take precedence over the default dev URLs
- Make sure your Vercel deployment is live and accessible









