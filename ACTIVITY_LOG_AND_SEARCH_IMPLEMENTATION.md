# Activity Log & Global Search Implementation

## Overview

This document describes the implementation of two major features:
1. **Activity Log / Audit Trail** - Track all user actions for security and compliance
2. **Global Search** - Search across events, surveys, and users

## Features Implemented

### 1. Activity Log / Audit Trail

#### Database Schema
- **Table**: `activity_logs`
- **File**: `create_activity_logs_table.sql`
- **Features**:
  - Tracks user actions (create, update, delete, view, login, logout)
  - Records resource type and ID
  - Stores before/after details in JSONB
  - Includes IP address and user agent
  - Row Level Security (RLS) policies
  - Indexed for performance

#### Service Layer
- **File**: `apps/Web/src/services/activityLogService.ts`
- **Methods**:
  - `logActivity()` - Log a user action
  - `getActivityLogs()` - Get logs with filters and pagination
  - `getResourceActivity()` - Get activity for a specific resource
  - `getUserActivitySummary()` - Get user activity summary
  - `deleteOldLogs()` - Cleanup old logs (admin only)

#### UI Components
- **File**: `apps/Web/src/components/sections/ActivityLog.jsx`
- **Features**:
  - Admin-only access
  - Advanced filtering (action, resource type, date range, search)
  - Pagination
  - Real-time updates
  - Detailed view with before/after states

#### Utility Helper
- **File**: `apps/Web/src/utils/activityLogger.ts`
- **Purpose**: Easy-to-use helper functions for logging activities
- **Functions**:
  - `logActivity()` - Simple logging function
  - `createActivityDetails()` - Helper to create before/after details

### 2. Global Search

#### Service Layer
- **File**: `apps/Web/src/services/searchService.ts`
- **Features**:
  - Search across events, surveys, and users
  - Relevance scoring
  - Filtering by type, status, role
  - Autocomplete suggestions
  - Full-text search capabilities

#### UI Components
- **File**: `apps/Web/src/components/sections/GlobalSearch.jsx`
- **Features**:
  - Real-time search suggestions
  - Advanced filters
  - Result categorization
  - Click to navigate to results
  - Beautiful, modern UI

## Setup Instructions

### 1. Database Setup

Run the SQL migration file in your Supabase SQL Editor:

```sql
-- Run create_activity_logs_table.sql
```

This will create:
- `activity_logs` table
- Indexes for performance
- RLS policies
- `log_activity()` database function

### 2. Navigation

The following routes have been added:
- `/activity-log` - Activity log page (admin only)
- `/search` - Global search page (all authenticated users)

Navigation links have been added to:
- Navbar (desktop and mobile)
- Admin section

### 3. Integration with Services

To add activity logging to your services, use the utility helper:

```typescript
import { logActivity, createActivityDetails } from '../utils/activityLogger';

// Example: Log event creation
await logActivity(userId, 'create', 'event', {
  resourceId: event.id,
  resourceName: event.title,
  details: createActivityDetails(null, event)
});

// Example: Log event update
await logActivity(userId, 'update', 'event', {
  resourceId: event.id,
  resourceName: event.title,
  details: createActivityDetails(oldEvent, newEvent, ['title', 'venue'])
});
```

## Next Steps

### Recommended Integrations

1. **Event Service** (`eventService.ts`):
   - Log `create` when creating events
   - Log `update` when updating events
   - Log `delete` when deleting events
   - Log `view` when viewing event details

2. **Survey Service** (`surveyService.ts`):
   - Log `create` when creating surveys
   - Log `update` when updating surveys
   - Log `delete` when deleting surveys
   - Log `view` when viewing survey details

3. **Auth Context** (`AuthContext.jsx`):
   - Log `login` when users sign in
   - Log `logout` when users sign out

4. **User Service** (`userService.ts`):
   - Log `update` when updating user profiles
   - Log `view` when viewing user profiles

## Usage Examples

### Activity Log Page

1. Navigate to `/activity-log` (admin only)
2. Use filters to find specific activities
3. View detailed before/after states
4. Export logs if needed (future enhancement)

### Global Search

1. Click "Search" in the navbar
2. Enter search query
3. See real-time suggestions
4. Filter by type, status, role
5. Click results to navigate

## Security Considerations

- Activity logs are protected by RLS policies
- Only admins can view all logs
- Users can only view their own logs
- IP addresses and user agents are logged for security
- Old logs can be cleaned up by admins

## Performance

- Indexes created for common query patterns
- Pagination implemented (50 logs per page)
- Efficient filtering at database level
- Search uses database indexes for fast queries

## Future Enhancements

1. **Export Functionality**: Export logs to CSV/JSON
2. **Real-time Updates**: WebSocket updates for new logs
3. **Advanced Analytics**: Charts and graphs for activity patterns
4. **Saved Searches**: Save frequently used search filters
5. **Search History**: Remember recent searches
6. **Search Bookmarks**: Save important search results

