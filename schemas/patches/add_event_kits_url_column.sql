-- Add event_kits_url column to events table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'event_kits_url'
    ) THEN
        ALTER TABLE events ADD COLUMN event_kits_url TEXT;
        RAISE NOTICE 'Added event_kits_url column to events table';
    ELSE
        RAISE NOTICE 'event_kits_url column already exists in events table';
    END IF;
END $$;

-- Check if the column was added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name LIKE '%url%'
ORDER BY column_name;
