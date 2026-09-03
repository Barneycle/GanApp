# Production Testing Guide - Phase 1

This guide explains how to test Phase 1 changes (LoggerService and Activity Logging) in real-world scenarios and production environments.

## Table of Contents
1. [Testing LoggerService](#testing-loggerservice)
2. [Testing Activity Logging](#testing-activity-logging)
3. [Browser Console Verification](#browser-console-verification)
4. [Database Verification](#database-verification)
5. [Production Monitoring](#production-monitoring)

---

## Testing LoggerService

### 1. Development Environment Testing

#### Check Console Output
1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Perform actions that trigger logging:
   - Create/update/delete an event
   - Generate a certificate
   - Send a notification
   - Update user profile

#### Expected Log Format
You should see logs with service name prefixes:
```
[INFO] [EventService] Event created successfully { eventId: '...', title: '...' }
[INFO] [CertificateJobProcessor] Starting certificate generation { jobId: '...' }
[ERROR] [NotificationJobProcessor] Failed to send notification { error: '...' }
```

#### Verify Log Levels
- **Development**: Should see DEBUG, INFO, WARN, and ERROR logs
- **Production**: Should only see ERROR logs (unless you change log level)

### 2. Production Environment Testing

#### Check Production Console
1. Deploy to production (Vercel/Netlify/etc.)
2. Open production site in browser
3. Open Developer Tools → Console
4. Perform critical actions (create event, update profile, etc.)

#### Expected Behavior
- **ERROR logs**: Should always appear (even in production)
- **INFO/WARN logs**: Should NOT appear (filtered out in production)
- **DEBUG logs**: Should NOT appear (development only)

#### Test Error Logging
1. Trigger an error scenario:
   - Try to create event with invalid data
   - Try to access non-existent resource
   - Trigger a network error
2. Check console for `[ERROR]` logs with service name prefixes

---

## Testing Activity Logging

### 1. Verify Activity Logs in Database

#### Check Supabase Dashboard
1. Go to Supabase Dashboard → Table Editor
2. Navigate to `activity_logs` table
3. Perform actions and refresh the table

#### Actions to Test

**User Actions:**
```sql
-- Check login activity
SELECT * FROM activity_logs 
WHERE action = 'login' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check logout activity
SELECT * FROM activity_logs 
WHERE action = 'logout' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Event Actions:**
```sql
-- Check event creation
SELECT * FROM activity_logs 
WHERE resource_type = 'event' AND action = 'create'
ORDER BY created_at DESC 
LIMIT 10;

-- Check event updates
SELECT * FROM activity_logs 
WHERE resource_type = 'event' AND action = 'update'
ORDER BY created_at DESC 
LIMIT 10;

-- Check event deletions
SELECT * FROM activity_logs 
WHERE resource_type = 'event' AND action = 'delete'
ORDER BY created_at DESC 
LIMIT 10;
```

**Survey Actions:**
```sql
-- Check survey updates
SELECT * FROM activity_logs 
WHERE resource_type = 'survey' AND action = 'update'
ORDER BY created_at DESC 
LIMIT 10;

-- Check survey deletions
SELECT * FROM activity_logs 
WHERE resource_type = 'survey' AND action = 'delete'
ORDER BY created_at DESC 
LIMIT 10;
```

**User Profile Actions:**
```sql
-- Check profile updates
SELECT * FROM activity_logs 
WHERE resource_type = 'user' AND action = 'update'
ORDER BY created_at DESC 
LIMIT 10;
```

### 2. Test Activity Logging Scenarios

#### Test Case 1: Create Event
1. **Action**: Create a new event
2. **Expected Log Entry**:
   - `action`: `'create'`
   - `resource_type`: `'event'`
   - `resource_id`: Event ID
   - `resource_name`: Event title
   - `user_id`: Your user ID
   - `ip_address`: Your IP address
   - `user_agent`: Browser user agent

#### Test Case 2: Update Event
1. **Action**: Update an existing event (change title, date, etc.)
2. **Expected Log Entry**:
   - `action`: `'update'`
   - `resource_type`: `'event'`
   - `details`: JSON object with `old` and `new` values showing what changed

#### Test Case 3: Delete Event
1. **Action**: Delete an event
2. **Expected Log Entry**:
   - `action`: `'delete'`
   - `resource_type`: `'event'`
   - `resource_name`: Event title (before deletion)

#### Test Case 4: Update Profile
1. **Action**: Update your user profile (name, email, etc.)
2. **Expected Log Entry**:
   - `action`: `'update'`
   - `resource_type`: `'user'`
   - `details`: JSON showing changed fields

#### Test Case 5: Login/Logout
1. **Action**: Log in or log out
2. **Expected Log Entry**:
   - `action`: `'login'` or `'logout'`
   - `resource_type`: `'auth'`
   - `ip_address`: Your IP address

### 3. Verify Activity Log Details

Check that `details` field contains meaningful information:

```sql
-- View activity log details
SELECT 
  id,
  action,
  resource_type,
  resource_name,
  details,
  ip_address,
  user_agent,
  created_at
FROM activity_logs
ORDER BY created_at DESC
LIMIT 20;
```

**Expected `details` format for updates:**
```json
{
  "old": {
    "title": "Old Event Title",
    "date": "2024-01-01"
  },
  "new": {
    "title": "New Event Title",
    "date": "2024-01-02"
  },
  "changed_fields": ["title", "date"]
}
```

---

## Browser Console Verification

### 1. Check for Old console.log Statements

#### Search Console Output
1. Open Browser DevTools → Console
2. Use Console filter: Search for `console.log` (should find nothing)
3. Search for `console.error` (should only find LoggerService errors)

#### Verify Service-Specific Logs
All logs should have service name prefixes:
- ✅ `[EventService]`
- ✅ `[CertificateJobProcessor]`
- ✅ `[NotificationJobProcessor]`
- ✅ `[AdminService]`
- ✅ `[UserService]`
- ✅ `[JobQueueService]`

### 2. Test Error Scenarios

#### Network Error Test
1. Disconnect internet
2. Try to create/update an event
3. Check console for: `[ERROR] [EventService] Failed to...`

#### Validation Error Test
1. Try to create event with empty title
2. Check console for: `[ERROR] [EventService] Validation failed...`

#### Database Error Test
1. Temporarily break Supabase connection
2. Perform any action
3. Check console for: `[ERROR] [ServiceName] Database error...`

---

## Database Verification

### 1. Check Activity Logs Table Structure

```sql
-- Verify table exists and has correct columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_logs'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid)
- `user_id` (uuid)
- `action` (text)
- `resource_type` (text)
- `resource_id` (uuid)
- `resource_name` (text)
- `details` (jsonb)
- `ip_address` (inet)
- `user_agent` (text)
- `created_at` (timestamp)

### 2. Verify RPC Function Exists

```sql
-- Check if log_activity function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'log_activity';
```

### 3. Test RPC Function Directly

```sql
-- Test the log_activity function
SELECT log_activity(
  '00000000-0000-0000-0000-000000000000'::uuid, -- user_id
  'test'::text,                                  -- action
  'test_resource'::text,                        -- resource_type
  'test-id'::uuid,                              -- resource_id
  'Test Resource'::text,                        -- resource_name
  '{"test": "data"}'::jsonb,                    -- details
  '127.0.0.1'::inet,                            -- ip_address
  'Test User Agent'::text                        -- user_agent
);
```

---

## Production Monitoring

### 1. Browser Console Monitoring

#### Set Up Console Monitoring
1. Use browser extensions to capture console logs
2. Or use services like LogRocket, Sentry, or Datadog

#### Monitor Error Rates
- Track `[ERROR]` log frequency
- Alert on sudden spikes in errors
- Monitor service-specific error patterns

### 2. Database Monitoring

#### Activity Log Analytics

```sql
-- Activity logs by action type (last 24 hours)
SELECT 
  action,
  COUNT(*) as count
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action
ORDER BY count DESC;

-- Activity logs by resource type (last 24 hours)
SELECT 
  resource_type,
  COUNT(*) as count
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY resource_type
ORDER BY count DESC;

-- Most active users (last 24 hours)
SELECT 
  user_id,
  COUNT(*) as action_count
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
ORDER BY action_count DESC
LIMIT 10;
```

### 3. Error Tracking Integration

#### Current Status
LoggerService has a TODO for error tracking integration:
```typescript
// In production, send to error tracking service
if (this.isProduction && error) {
  // TODO: Integrate with error tracking service (e.g., Sentry, LogRocket)
}
```

#### Recommended Integrations

**Option 1: Sentry**
```bash
npm install @sentry/react
```

Then update `loggerService.ts`:
```typescript
import * as Sentry from '@sentry/react';

static error(message: string, error?: any, context?: LogContext): void {
  if (this.logLevel <= LogLevel.ERROR) {
    console.error(`[ERROR] ${message}`, error || '', context || '');
    
    if (this.isProduction && error) {
      Sentry.captureException(error, {
        extra: { message, context }
      });
    }
  }
}
```

**Option 2: LogRocket**
```bash
npm install logrocket
```

**Option 3: Custom API Endpoint**
Send errors to your own logging API.

---

## Quick Test Checklist

### ✅ LoggerService Tests
- [ ] Console shows service-prefixed logs (`[ServiceName]`)
- [ ] No raw `console.log` statements appear
- [ ] ERROR logs appear in production
- [ ] INFO/DEBUG logs filtered in production
- [ ] Service-specific methods work (`serviceLog`, `serviceError`)

### ✅ Activity Logging Tests
- [ ] Login creates activity log entry
- [ ] Logout creates activity log entry
- [ ] Event creation creates activity log entry
- [ ] Event update creates activity log entry with details
- [ ] Event deletion creates activity log entry
- [ ] Survey update creates activity log entry
- [ ] Survey deletion creates activity log entry
- [ ] Profile update creates activity log entry
- [ ] All logs include IP address and user agent
- [ ] All logs include user_id

### ✅ Database Tests
- [ ] `activity_logs` table exists
- [ ] `log_activity` RPC function exists
- [ ] RPC function can be called directly
- [ ] Logs are queryable and searchable

---

## Troubleshooting

### Issue: No activity logs appearing

**Check:**
1. Is user logged in? (`currentUser?.id` must exist)
2. Is RPC function working? (test with SQL query above)
3. Check browser console for errors
4. Check Supabase logs for RPC errors

### Issue: Console shows old console.log statements

**Check:**
1. Rebuild the application (`npm run build`)
2. Clear browser cache
3. Check if file was actually updated (search codebase)

### Issue: Activity log details are empty

**Check:**
1. Verify `createActivityDetails` is being called
2. Check that old/new data is being passed correctly
3. Verify JSON serialization is working

---

## Next Steps

1. **Integrate Error Tracking**: Add Sentry/LogRocket for production error monitoring
2. **Activity Log UI**: Build admin interface to view activity logs
3. **Analytics Dashboard**: Create dashboard showing activity trends
4. **Alerting**: Set up alerts for critical errors or suspicious activity patterns

