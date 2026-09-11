# Push Notifications Setup Guide

This guide explains how push notifications work in the mobile app and how to set them up.

## Overview

The app now supports **push notifications** that appear in the device's notification bar. When a notification is created in the database, it will:

1. Appear in the app's Notifications tab (in-app)
2. Show as a push notification in the device notification bar
3. Navigate to the relevant screen when tapped

## Current Implementation

### What's Included:

1. **Push Notification Service** (`apps/Mobile/lib/pushNotificationService.ts`)
   - Requests notification permissions
   - Gets Expo push tokens
   - Registers tokens with Supabase
   - Sends local notifications
   - Handles notification taps

2. **Integration Points:**
   - Automatically requests permissions on app start
   - Registers push token when user signs in
   - Sends push notification when database notification is created
   - Handles notification taps to navigate to relevant screens

3. **Database Table:**
   - `user_push_tokens` table stores push tokens per user/platform
   - Run `create_user_push_tokens_table.sql` to create the table

## Setup Instructions

### Step 1: Install Dependencies

```bash
cd apps/Mobile
npm install expo-notifications
```

### Step 2: Create Database Table

Run the SQL script in Supabase SQL Editor:

```sql
-- Run create_user_push_tokens_table.sql
```

### Step 3: Rebuild the App

Since we added a new native module (`expo-notifications`), you need to rebuild:

```bash
# For development
npx expo prebuild --clean

# Or rebuild native apps
npm run android
# or
npm run ios
```

### Step 4: Test Push Notifications

1. **Grant Permissions:**
   - When you first open the app, it will request notification permissions
   - Grant permissions to enable push notifications

2. **Test Notifications:**
   - Go to the Notifications tab
   - Tap the "Test" button
   - You should see:
     - Notification appears in the app's notification list
     - Push notification appears in device notification bar
     - Badge count updates on the tab icon

3. **Test Notification Tap:**
   - Send yourself a test notification
   - Tap the notification in the device notification bar
   - App should open and navigate to the relevant screen

## How It Works

### Flow:

1. **User Signs In:**
   - App requests notification permissions
   - Gets Expo push token
   - Stores token in `user_push_tokens` table

2. **Notification Created:**
   - Database trigger or function creates notification
   - Real-time subscription detects new notification
   - Push notification service sends local notification
   - Notification appears in device notification bar

3. **User Taps Notification:**
   - App opens (or comes to foreground)
   - Notification handler receives tap event
   - Navigates to action URL (e.g., event details, notifications tab)

## Features

### ✅ Currently Working:

- **Local Notifications:** Notifications appear in device notification bar when created
- **Permission Handling:** Requests permissions automatically
- **Token Registration:** Stores push tokens in database
- **Notification Taps:** Handles taps to navigate to relevant screens
- **Badge Count:** Updates badge count on notifications tab

### 🔄 Future Enhancements:

- **Remote Push Notifications:** Send notifications via Expo Push Notification Service (requires backend setup)
- **Notification Categories:** Group notifications by type
- **Rich Notifications:** Add images, actions, etc.
- **Scheduled Notifications:** Schedule notifications for future delivery

## Troubleshooting

### Notifications Not Appearing:

1. **Check Permissions:**
   ```javascript
   import * as Notifications from 'expo-notifications';
   const { status } = await Notifications.getPermissionsAsync();
   console.log('Notification permission:', status);
   ```

2. **Check Token:**
   ```javascript
   const token = await Notifications.getExpoPushTokenAsync();
   console.log('Push token:', token);
   ```

3. **Check Database:**
   ```sql
   SELECT * FROM user_push_tokens WHERE user_id = 'your-user-id';
   ```

### Notifications Not Navigating:

- Check that `action_url` is set correctly in the notification
- Verify the route exists in your app navigation
- Check console logs for navigation errors

### Android Issues:

- Make sure `POST_NOTIFICATIONS` permission is in `app.json`
- Android 13+ requires explicit notification permission
- Rebuild the app after adding permissions

### iOS Issues:

- Make sure notification permissions are requested
- Check that app is properly configured in Xcode
- Verify push notification capability is enabled

## Testing

### Manual Test:

1. Create a test notification using the "Test" button
2. Check device notification bar
3. Tap notification
4. Verify navigation works

### Database Test:

```sql
-- Create a test notification
INSERT INTO notifications (user_id, title, message, type)
VALUES ('your-user-id', 'Test Notification', 'This is a test', 'info');
```

The notification should appear in both:
- App's notification list
- Device notification bar

## Notes

- **Local Notifications:** Currently using local notifications (shown immediately when created)
- **Remote Push:** For remote push notifications, you'll need to set up Expo Push Notification Service
- **Background:** Notifications work when app is in background or closed
- **Foreground:** Notifications also show when app is in foreground

