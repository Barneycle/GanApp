# Migration Guide: Speakers and Sponsors to Separate Tables

## Overview
This migration moves speakers and sponsors data from JSON columns and URL fields in the events table to separate normalized tables with proper relationships.

## Database Changes Made

### 1. Dropped Columns from `events` table:
- `sponsors` (JSONB)
- `guest_speakers` (JSONB) 
- `sponsor_logos_url` (TEXT)
- `speaker_photos_url` (TEXT)

### 2. Created New Tables:

#### `guest_speakers` table:
- `id` (UUID, Primary Key)
- `prefix` (VARCHAR(50)) - Dr., Prof., Mr., Ms., etc.
- `first_name` (VARCHAR(100), NOT NULL)
- `last_name` (VARCHAR(100), NOT NULL)
- `middle_initial` (VARCHAR(5))
- `affix` (VARCHAR(50)) - Jr., Sr., III, etc.
- `designation` (VARCHAR(200)) - Job title/position
- `organization` (VARCHAR(300))
- `bio` (TEXT)
- `email` (VARCHAR(255))
- `phone` (VARCHAR(50))
- `photo_url` (TEXT)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

#### `sponsors` table:
- `id` (UUID, Primary Key)
- `name` (VARCHAR(300), NOT NULL)
- `contact_person` (VARCHAR(200))
- `email` (VARCHAR(255))
- `phone` (VARCHAR(50))
- `address` (TEXT)
- `logo_url` (TEXT)
- `role` (VARCHAR(100)) - Main Sponsor, Gold Sponsor, etc.
- `contribution` (TEXT)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

#### `event_speakers` junction table:
- `id` (UUID, Primary Key)
- `event_id` (UUID, Foreign Key to events.id)
- `speaker_id` (UUID, Foreign Key to guest_speakers.id)
- `speaker_order` (INTEGER) - For ordering speakers
- `is_keynote` (BOOLEAN) - Mark keynote speakers
- `created_at` (TIMESTAMP WITH TIME ZONE)

#### `event_sponsors` junction table:
- `id` (UUID, Primary Key)
- `event_id` (UUID, Foreign Key to events.id)
- `sponsor_id` (UUID, Foreign Key to sponsors.id)
- `sponsor_order` (INTEGER) - For ordering sponsors
- `created_at` (TIMESTAMP WITH TIME ZONE)

## Code Changes Made

### 1. Created New Service Files:
- `apps/Web/src/services/speakerService.ts`
- `apps/Web/src/services/sponsorService.ts`
- `apps/Mobile/lib/speakerService.ts`
- `apps/Mobile/lib/sponsorService.ts`

### 2. Updated Event Interfaces:
- Removed `sponsors`, `guest_speakers`, `sponsor_logos_url`, `speaker_photos_url` from Event interfaces
- Updated both Web and Mobile eventService files

## Frontend Components That Need Updates

### High Priority (Currently Broken):
1. **EventModal.jsx** (lines 162-177, 208-223)
   - Currently uses `event.speaker_photos_url` and `event.sponsor_logos_url`
   - Needs to fetch speakers/sponsors via new services

2. **CreateEvent.jsx** (lines 1363, 1368)
   - Currently sets `sponsor_logos_url` and `speaker_photos_url`
   - Needs to create/link speakers and sponsors separately

3. **Events.jsx** (lines 1001-1016, 1970-1973)
   - Currently handles sponsor/speaker photo URLs
   - Needs to use new speaker/sponsor services

### Medium Priority:
- Any other components that display event speakers or sponsors
- Admin panels for managing speakers/sponsors

## Migration Steps for Frontend

### 1. Update EventModal Component:
```javascript
// Instead of:
event.guest_speakers?.map((speaker, index) => ...)

// Use:
const { speakers } = await SpeakerService.getEventSpeakers(event.id);
speakers.map(eventSpeaker => ...)
```

### 2. Update CreateEvent Component:
```javascript
// Instead of setting URLs:
eventData.sponsor_logos_url = uploadedFiles.sponsorLogos.map(f => f.url).join(',');

// Create speakers/sponsors separately and link them:
const speakerResult = await SpeakerService.createSpeaker(speakerData);
await SpeakerService.addSpeakerToEvent(eventId, speakerResult.speaker.id);
```

### 3. Add Speaker/Sponsor Management UI:
- Create forms for adding/editing speakers
- Create forms for adding/editing sponsors
- Add selection interfaces for linking existing speakers/sponsors to events

## Data Migration (If Needed)

If you have existing data in the old format, you'll need to:

1. **Export existing data** before running the migration:
```sql
SELECT id, sponsors, guest_speakers, sponsor_logos_url, speaker_photos_url 
FROM events 
WHERE sponsors IS NOT NULL OR guest_speakers IS NOT NULL;
```

2. **Parse and insert** into new tables:
   - Parse JSON speakers/sponsors data
   - Create entries in `guest_speakers` and `sponsors` tables
   - Create relationships in junction tables
   - Update photo URLs to individual speaker/sponsor records

3. **Verify migration** by comparing counts and spot-checking data

## Benefits of New Structure

1. **Normalization**: No duplicate speaker/sponsor data across events
2. **Flexibility**: Rich metadata for speakers and sponsors
3. **Scalability**: Easy to add new fields without affecting events table
4. **Relationships**: Proper foreign key constraints and referential integrity
5. **Queries**: More efficient queries for speaker/sponsor data
6. **Management**: Centralized speaker/sponsor management

## Running the Migration

1. **Backup your database** first!
2. Run the migration SQL: `migrate_speakers_sponsors_to_separate_tables.sql`
3. Update your application code to use new services
4. Test thoroughly before deploying to production

## Rollback Plan

If you need to rollback:
1. Add the dropped columns back to events table
2. Migrate data back from new tables to JSON/URL format
3. Revert code changes
4. Drop the new tables

Keep the migration SQL file and this guide for reference.
