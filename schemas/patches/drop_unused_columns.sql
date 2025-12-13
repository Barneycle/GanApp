-- Drop unused columns from events table
-- These columns are no longer needed

-- Drop programme_url column
ALTER TABLE events 
DROP COLUMN IF EXISTS programme_url;

-- Drop materials_url column
ALTER TABLE events 
DROP COLUMN IF EXISTS materials_url;

-- Verify the columns were dropped
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('programme_url', 'materials_url')
ORDER BY column_name;

-- Show remaining columns for verification
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY column_name;
