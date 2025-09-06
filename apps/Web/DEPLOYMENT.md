# Vercel Deployment Guide

## Prerequisites
1. Make sure you have the latest code pushed to your repository
2. Ensure all environment variables are set in Vercel

## Environment Variables in Vercel
Go to your Vercel project dashboard → Settings → Environment Variables and add:

```
VITE_SUPABASE_URL=https://hekjabrlgdpbffzidshz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhla2phYnJsZ2RwYmZmemlkc2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2Njk3ODAsImV4cCI6MjA3MTI0NTc4MH0.omgtL7BDdTNBEj1bQYY9-ipj3KWc_onkGLdDTUBD81E
```

## Build Issues
If you encounter build issues:

1. **Check Vercel build logs** for specific error messages
2. **Verify environment variables** are properly set
3. **Ensure monorepo structure** is maintained
4. **Check if shared package** is accessible during build

## Common Problems
- **White screen**: Usually means JavaScript errors or missing dependencies
- **Build failures**: Check for path resolution issues or missing files
- **Environment variables**: Ensure they're set in Vercel dashboard

## Testing Locally
Before deploying, test the build locally:
```bash
npm run build
npm run preview
```

## Deployment Steps
1. Push code to repository
2. Vercel will automatically trigger build
3. Check build logs for any errors
4. Verify deployment at your Vercel URL
