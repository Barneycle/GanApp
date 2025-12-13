-- Add missing columns to events table
-- These columns are referenced in the EventService interface but missing from the database schema

-- Add sponsor_logos_url column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS sponsor_logos_url TEXT;

-- Add speaker_photos_url column  
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS speaker_photos_url TEXT;

-- Add certificate_templates_url column (also referenced in CreateEvent.jsx)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS certificate_templates_url TEXT;

-- Add event_programmes_url column (also referenced in CreateEvent.jsx)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS event_programmes_url TEXT;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('sponsor_logos_url', 'speaker_photos_url', 'certificate_templates_url', 'event_programmes_url')
ORDER BY column_name;
