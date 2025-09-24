-- Migration: Drop speakers/sponsors columns from events table and create separate tables
-- This migration will:
-- 1. Drop sponsors, guest_speakers, sponsor_logos_url, speaker_photos_url columns from events table
-- 2. Create separate guest_speakers and sponsors tables
-- 3. Create junction tables for many-to-many relationships

-- =====================================================
-- STEP 1: Drop columns from events table
-- =====================================================

-- Drop the JSON columns and photo URL columns
ALTER TABLE events 
DROP COLUMN IF EXISTS sponsors,
DROP COLUMN IF EXISTS guest_speakers,
DROP COLUMN IF EXISTS sponsor_logos_url,
DROP COLUMN IF EXISTS speaker_photos_url;

-- =====================================================
-- STEP 2: Create guest_speakers table
-- =====================================================

CREATE TABLE IF NOT EXISTS guest_speakers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prefix VARCHAR(50), -- Dr., Prof., Mr., Ms., etc.
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_initial VARCHAR(5),
  affix VARCHAR(50), -- Jr., Sr., III, etc.
  designation VARCHAR(200), -- Job title/position
  organization VARCHAR(300),
  bio TEXT,
  email VARCHAR(255),
  phone VARCHAR(11),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for guest_speakers
ALTER TABLE guest_speakers ENABLE ROW LEVEL SECURITY;

-- Create indexes for guest_speakers
CREATE INDEX IF NOT EXISTS idx_guest_speakers_name ON guest_speakers(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_guest_speakers_organization ON guest_speakers(organization);
CREATE INDEX IF NOT EXISTS idx_guest_speakers_email ON guest_speakers(email);

-- =====================================================
-- STEP 3: Create sponsors table
-- =====================================================

CREATE TABLE IF NOT EXISTS sponsors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(300) NOT NULL,
  contact_person VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(11),
  address TEXT,
  logo_url TEXT,
  role VARCHAR(100), -- Main Sponsor, Gold Sponsor, Silver Sponsor, etc.
  contribution TEXT, -- Description of what they're contributing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for sponsors
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- Create indexes for sponsors
CREATE INDEX IF NOT EXISTS idx_sponsors_name ON sponsors(name);
CREATE INDEX IF NOT EXISTS idx_sponsors_role ON sponsors(role);
CREATE INDEX IF NOT EXISTS idx_sponsors_email ON sponsors(email);

-- =====================================================
-- STEP 4: Create junction tables for many-to-many relationships
-- =====================================================

-- Junction table for events and guest speakers
CREATE TABLE IF NOT EXISTS event_speakers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES guest_speakers(id) ON DELETE CASCADE,
  speaker_order INTEGER DEFAULT 0, -- For ordering speakers in events
  is_keynote BOOLEAN DEFAULT false, -- Mark keynote speakers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of event and speaker
  UNIQUE(event_id, speaker_id)
);

-- Junction table for events and sponsors
CREATE TABLE IF NOT EXISTS event_sponsors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  sponsor_order INTEGER DEFAULT 0, -- For ordering sponsors in events
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of event and sponsor
  UNIQUE(event_id, sponsor_id)
);

-- Enable Row Level Security for junction tables
ALTER TABLE event_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sponsors ENABLE ROW LEVEL SECURITY;

-- Create indexes for junction tables
CREATE INDEX IF NOT EXISTS idx_event_speakers_event_id ON event_speakers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_speakers_speaker_id ON event_speakers(speaker_id);
CREATE INDEX IF NOT EXISTS idx_event_speakers_order ON event_speakers(event_id, speaker_order);

CREATE INDEX IF NOT EXISTS idx_event_sponsors_event_id ON event_sponsors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsors_sponsor_id ON event_sponsors(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsors_order ON event_sponsors(event_id, sponsor_order);

-- =====================================================
-- STEP 5: Create RLS policies (basic policies - adjust as needed)
-- =====================================================

-- Guest speakers policies
CREATE POLICY "Allow read access to guest_speakers" ON guest_speakers
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage guest_speakers" ON guest_speakers
FOR ALL USING (auth.role() = 'authenticated');

-- Sponsors policies  
CREATE POLICY "Allow read access to sponsors" ON sponsors
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage sponsors" ON sponsors
FOR ALL USING (auth.role() = 'authenticated');

-- Event speakers junction policies
CREATE POLICY "Allow read access to event_speakers" ON event_speakers
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage event_speakers" ON event_speakers
FOR ALL USING (auth.role() = 'authenticated');

-- Event sponsors junction policies
CREATE POLICY "Allow read access to event_sponsors" ON event_sponsors
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage event_sponsors" ON event_sponsors
FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- STEP 6: Create updated_at triggers
-- =====================================================

-- Trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_guest_speakers_updated_at 
    BEFORE UPDATE ON guest_speakers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsors_updated_at 
    BEFORE UPDATE ON sponsors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION QUERIES (uncomment to test)
-- =====================================================

-- Check that columns were dropped
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'events' AND column_name IN ('sponsors', 'guest_speakers', 'sponsor_logos_url', 'speaker_photos_url');

-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('guest_speakers', 'sponsors', 'event_speakers', 'event_sponsors');
