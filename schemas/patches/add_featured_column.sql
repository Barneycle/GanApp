-- Add featured column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;

-- Create an index on the featured column for better performance
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(featured);

-- Optional: Set one existing published event as featured (uncomment if needed)
-- UPDATE events SET featured = TRUE WHERE status = 'published' LIMIT 1;
