-- Create table to track certificate generation count per event
CREATE TABLE IF NOT EXISTS certificate_counters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  current_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_certificate_counters_event_id ON certificate_counters(event_id);

-- Enable Row Level Security
ALTER TABLE certificate_counters ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read counters
CREATE POLICY "Allow authenticated users to view counters"
  ON certificate_counters FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert counters
CREATE POLICY "Allow authenticated users to insert counters"
  ON certificate_counters FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update counters
CREATE POLICY "Allow authenticated users to update counters"
  ON certificate_counters FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to atomically reserve the next certificate number for an event.
-- INSERT ... ON CONFLICT serializes concurrent callers on the event_id unique key.
CREATE OR REPLACE FUNCTION get_next_certificate_number(event_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  INSERT INTO certificate_counters (event_id, current_count)
  VALUES (event_uuid, 1)
  ON CONFLICT (event_id)
  DO UPDATE SET
    current_count = certificate_counters.current_count + 1,
    updated_at = NOW()
  RETURNING current_count INTO next_number;

  RETURN next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

