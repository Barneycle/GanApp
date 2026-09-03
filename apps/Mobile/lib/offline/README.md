# Offline-First Architecture

This directory contains the offline-first architecture implementation for the mobile app.

## Overview

The offline-first architecture ensures the app works seamlessly even when network connectivity is poor or unavailable. It uses a hybrid storage approach:

- **AsyncStorage**: For app state and configuration
- **SQLite**: For structured data (events, attendance, surveys)
- **File System**: For files and images

## Architecture Components

### 1. Network Status Monitor (`networkStatus.ts`)
- Monitors network connectivity in real-time
- Provides reactive updates via hooks
- Detects online/offline state

### 2. Conflict Resolution Service (`conflictResolution.ts`)
Implements different conflict resolution strategies per data type:

- **Attendance Records**: Server wins (official data)
- **Evaluation Surveys**: Last write wins (client wins for user answers)
- **Event Metadata**: User chooses (editable content)
- **Images/Uploads**: Keep both (files)
- **Certificates**: Server wins HARD (official data)

### 3. Sync Queue Service (`syncQueue.ts`)
- Manages offline operations queue
- Priority-based ordering (Critical → High → Medium → Low)
- Retry logic with exponential backoff
- Persistent storage in AsyncStorage

### 4. Local Database Service (`localDatabase.ts`)
- SQLite database for offline data storage
- Tables: events, attendance_logs, survey_responses, event_registrations, certificates
- Automatic sync tracking

### 5. Sync Service (`syncService.ts`)
- Handles synchronization between local and server
- Auto-syncs when network is available
- Processes queue with priority ordering
- Pulls updates from server

## Usage

### Initialization

```typescript
import { initializeOfflineFirst } from './lib/offline';

// In app root layout
useEffect(() => {
  initializeOfflineFirst();
}, []);
```

### Using Offline-First Services

Services automatically handle offline scenarios:

```typescript
// EventService - automatically uses cache when offline
const { events, fromCache } = await EventService.getPublishedEvents();

// SurveyService - queues submissions when offline
const { response, queued } = await SurveyService.submitSurveyResponse(...);

// QRScanService - saves attendance locally when offline
const result = await QRScanService.processQRScan(...);
```

### Offline Indicator Component

```tsx
import { OfflineIndicator } from '../components/OfflineIndicator';

<OfflineIndicator />
```

## Priority Order

Operations are synced in priority order:

1. **CRITICAL**: Attendance check-ins
2. **HIGH**: Event registrations, evaluations
3. **MEDIUM**: Event metadata updates
4. **LOW**: Images, certificates (can be cached)

## Conflict Resolution

Conflicts are resolved automatically based on data type:

- **Server Wins**: Attendance, certificates, registrations
- **Last Write Wins**: Survey responses, evaluations
- **User Chooses**: Event metadata (future enhancement)
- **Keep Both**: Images/uploads

## Data Freshness

- Events list: Acceptable up to 24 hours stale
- Attendance: Acceptable up to 1-6 hours stale
- Certificates: Must be fresh
- User drafts: Infinite (local only)

## Testing Offline Mode

1. Enable airplane mode
2. Perform operations (check-in, submit survey, etc.)
3. Check offline indicator shows pending count
4. Disable airplane mode
5. Watch operations sync automatically

## Implementation Status

✅ Core offline infrastructure
✅ Network status monitoring
✅ Conflict resolution strategies
✅ Sync queue with priorities
✅ Local SQLite database
✅ Offline indicator component
✅ Auto-sync on reconnect
✅ EventService offline support
✅ SurveyService offline support
✅ QRScanService offline support

## Future Enhancements

- Manual sync controls
- Conflict resolution UI
- Sync progress indicators
- Background sync
- Delta updates
- Predictive refresh
