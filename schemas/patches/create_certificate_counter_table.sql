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

-- Function to get and increment certificate counter for an event
CREATE OR REPLACE FUNCTION get_next_certificate_number(event_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
  existing_count INTEGER;
BEGIN
  -- Check if counter exists
  SELECT current_count INTO existing_count
  FROM certificate_counters
  WHERE event_id = event_uuid;
  
  IF existing_count IS NULL THEN
    -- Create new counter starting at 1
    INSERT INTO certificate_counters (event_id, current_count)
    VALUES (event_uuid, 1)
    RETURNING current_count INTO next_number;
  ELSE
    -- Increment existing counter
    UPDATE certificate_counters
    SET current_count = current_count + 1,
        updated_at = NOW()
    WHERE event_id = event_uuid
    RETURNING current_count INTO next_number;
  END IF;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

