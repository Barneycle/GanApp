# Queue Recommendations for Web and Mobile App

This document outlines what operations should be processed via queues for optimal performance, scalability, and user experience.

## Current Status

### ✅ Already Implemented

1. **Certificate Generation** (Web) - ✅ Already in queue
   - Heavy PDF/PNG generation
   - Non-blocking background processing

2. **Mobile Offline Sync Queue** (Mobile App) - ✅ Already implemented
   - Attendance logs
   - Photo uploads
   - Event registrations
   - Survey responses
   - Event messages
   - Uses priority system (Critical → Low)

---

## High Priority: Should Be Queued (Web)

### 1. Bulk Notifications ⚠️ **Currently Synchronous**
**Location:** `apps/Web/src/services/adminService.ts::sendBulkNotifications()`

**Why Queue:**
- Can send to hundreds/thousands of users
- Currently blocks until all notifications are created
- Database inserts can be slow for large batches

**Implementation:**
- Queue job type: `bulk_notification`
- Process in batches (e.g., 50-100 notifications per batch)
- Job data: `{ userIds: string[], title, message, type, options }`
- Priority: Based on notification priority (urgent = 1, low = 10)

**Benefits:**
- Non-blocking admin interface
- Better error handling per batch
- Can retry failed batches
- Progress tracking for large sends

---

### 2. Email Sending ⚠️ **Should Be Queued**
**Location:** `apps/Web/src/services/emailService.ts`

**Why Queue:**
- Email services can be slow or fail
- Should not block user actions
- Need retry logic for failed sends

**Implementation:**
- Queue job type: `email_send`
- Job data: `{ to, subject, body, template?, attachments? }`
- Priority: High for transactional (password reset), Medium for notifications

**Use Cases:**
- Password reset emails
- Event reminder emails
- Bulk email campaigns
- Welcome emails

---

### 3. Large File Uploads & Media Processing ⚠️ **Should Be Queued**
**Location:** `apps/Web/src/services/fileUploadService.ts`

**Why Queue:**
- Large files can timeout during upload
- Image optimization/compression can be CPU-intensive
- Video processing for event materials

**Implementation:**
- Queue job type: `file_upload` or `media_processing`
- For files > 10MB: queue for background processing
- Job data: `{ filePath, bucketName, processingOptions, userId }`
- Priority: Low (background processing)

**Processing Tasks:**
- Image resizing/optimization
- Thumbnail generation
- Video transcoding (if applicable)
- Virus scanning (if needed)

---

### 4. Report Generation & Data Exports ⚠️ **Should Be Queued**
**Location:** `apps/Web/src/utils/exportUtils.ts`, `apps/Web/src/services/statisticsService.ts`

**Why Queue:**
- Large datasets can take time to process
- Memory-intensive operations (Excel generation)
- User should not wait for large exports

**Implementation:**
- Queue job type: `report_generation`
- Job data: `{ reportType, filters, format: 'csv' | 'excel' | 'pdf', userId }`
- Priority: Medium
- Store result in storage bucket, send download link when complete

**Report Types:**
- Event statistics exports
- Certificate generation reports
- Participant lists
- Attendance reports
- Survey response exports
- Bulk user exports

---

### 5. Bulk User Operations ⚠️ **Should Be Queued**
**Location:** `schemas/schema.sql::bulk_create_users()`, `bulk_archive_events()`

**Why Queue:**
- Creating/updating hundreds of users at once
- Can take significant time
- Database-heavy operations

**Implementation:**
- Queue job type: `bulk_user_operation`
- Job data: `{ operation: 'create' | 'update' | 'archive', userData, options }`
- Process in batches of 50-100
- Priority: Medium

**Operations:**
- Bulk user creation
- Bulk user updates
- Bulk user archiving
- Bulk role changes

---

### 6. Bulk Event Archiving ⚠️ **Should Be Queued**
**Location:** `schemas/schema.sql::bulk_archive_events()`

**Why Queue:**
- Archiving multiple events with related data
- Can involve many database operations
- Should not block admin interface

**Implementation:**
- Queue job type: `bulk_archive_events`
- Job data: `{ eventIds: string[], archiveReason, archivedBy }`
- Priority: Medium

---

### 7. Scheduled Event Reminders ⚠️ **Partially Queued**
**Location:** `scripts/send-event-reminders.js`, `schemas/notification_triggers.sql`

**Why Queue:**
- Currently runs via cron
- Should queue individual reminder sends for better tracking
- Allows retry for failed sends

**Implementation:**
- Keep cron job to queue reminder jobs
- Queue job type: `event_reminder`
- Job data: `{ eventId, userId, reminderType }`
- Priority: High (time-sensitive)

---

### 8. QR Code Generation (Bulk) ⚠️ **Should Be Queued**
**Location:** `apps/Web/src/components/sections/BulkQRCodeGenerator.jsx`

**Why Queue:**
- Generating many QR codes can be slow
- Image generation is CPU-intensive

**Implementation:**
- Queue job type: `bulk_qr_generation`
- Job data: `{ eventId, participantIds, format }`
- Priority: Medium

---

## Medium Priority: Nice to Have (Web)

### 9. Data Backup/Archive Operations
- Periodic database backups
- Archive old data
- Cleanup expired records

### 10. Analytics Processing
- Aggregating statistics
- Generating dashboards
- Processing analytics events

---

## Mobile App Queue Enhancements

### Current Mobile Sync Queue ✅
The mobile app already has a sync queue system with priorities:

**Priority Levels:**
1. **Critical** - Attendance, check-ins
2. **High** - Event registrations, evaluations  
3. **Medium** - Event metadata updates
4. **Low** - Images, certificates (can be cached)

### Recommended Enhancements:

1. **Photo Processing Queue** ⚠️ **Enhancement Needed**
   - Currently: Photos queued for upload when offline
   - Enhancement: Add image compression/resizing before upload
   - Reduce upload time and storage costs
   - Queue job type: `photo_processing`

2. **Batch Upload Optimization**
   - Group multiple small operations
   - Batch uploads when network conditions are good
   - Smart retry logic based on network status

3. **Conflict Resolution Queue**
   - Queue conflicting operations for manual review
   - Auto-retry with conflict resolution strategies
   - Priority: Medium

---

## Implementation Priority Matrix

| Operation | Priority | Impact | Complexity | Status |
|-----------|----------|--------|------------|--------|
| Certificate Generation | High | High | Medium | ✅ Done |
| Bulk Notifications | High | High | Low | ⚠️ Needs Implementation |
| Email Sending | High | Medium | Low | ⚠️ Needs Implementation |
| Report Generation | High | Medium | Medium | ⚠️ Needs Implementation |
| Large File Processing | Medium | Medium | Medium | ⚠️ Needs Implementation |
| Bulk User Operations | Medium | Low | Medium | ⚠️ Needs Implementation |
| Bulk Event Archiving | Medium | Low | Low | ⚠️ Needs Implementation |
| QR Code Generation (Bulk) | Low | Low | Low | ⚠️ Needs Implementation |

---

## Job Queue Architecture

### Current Job Types Supported:
- `certificate_generation` ✅

### Recommended New Job Types:

```typescript
type JobType = 
  | 'certificate_generation'           // ✅ Implemented
  | 'bulk_notification'                // ⚠️ High priority
  | 'email_send'                       // ⚠️ High priority
  | 'report_generation'                // ⚠️ High priority
  | 'file_upload'                      // ⚠️ Medium priority
  | 'media_processing'                 // ⚠️ Medium priority
  | 'bulk_user_operation'              // ⚠️ Medium priority
  | 'bulk_archive_events'              // ⚠️ Medium priority
  | 'event_reminder'                   // ⚠️ Medium priority
  | 'bulk_qr_generation'               // ⚠️ Low priority
  | 'photo_processing'                 // ⚠️ Mobile enhancement
```

---

## Queue Configuration Recommendations

### Priority Levels (1-10, 1 = highest):
- **1-2**: Critical operations (password resets, urgent notifications)
- **3-4**: High priority (event reminders, important notifications)
- **5-6**: Normal priority (certificates, regular notifications)
- **7-8**: Medium priority (reports, bulk operations)
- **9-10**: Low priority (background processing, media optimization)

### Batch Sizes:
- **Notifications**: 50-100 per batch
- **User Operations**: 50-100 per batch
- **Email Sends**: 25-50 per batch (email service rate limits)
- **File Processing**: 1 per job (can be large)

### Retry Strategy:
- **Max Attempts**: 3 (default)
- **Retry Delay**: Exponential backoff (5s, 15s, 45s)
- **Critical Jobs**: 5 attempts with shorter delays

---

## Next Steps

1. **Phase 1 (Immediate)**: Implement bulk notifications queue
2. **Phase 2 (Short-term)**: Add email sending and report generation queues
3. **Phase 3 (Medium-term)**: File processing and bulk operations queues
4. **Phase 4 (Long-term)**: Enhance mobile queue with photo processing

---

## Monitoring & Observability

For all queued operations, track:
- Queue depth (pending jobs)
- Processing time
- Success/failure rates
- Retry counts
- Job age (time in queue)

Consider adding:
- Queue metrics dashboard
- Alerts for stuck jobs
- Job status UI for users
- Admin panel for queue management




