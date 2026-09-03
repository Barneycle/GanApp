-- =====================================================
-- CERTIFICATE CONFIGS TABLE
-- Stores certificate design configurations for each event
-- 
-- IMPORTANT: This table uses Supabase Auth (auth.uid())
-- No references to a users table - all user IDs come from auth.uid()
-- =====================================================

CREATE TABLE IF NOT EXISTS certificate_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Design configuration
  background_color VARCHAR(7) DEFAULT '#ffffff',
  border_color VARCHAR(7) DEFAULT '#1e40af',
  border_width INTEGER DEFAULT 5,
  
  -- Title configuration
  title_text VARCHAR(255) DEFAULT 'Certificate of Participation',
  title_font_size INTEGER DEFAULT 48,
  title_color VARCHAR(7) DEFAULT '#1e40af',
  title_position JSONB DEFAULT '{"x": 50, "y": 15}',
  
  -- Name configuration
  name_config JSONB DEFAULT '{
    "font_size": 36,
    "color": "#000000",
    "position": {"x": 50, "y": 45},
    "font_family": "Arial, sans-serif",
    "font_weight": "bold"
  }',
  
  -- Event title configuration
  event_title_config JSONB DEFAULT '{
    "font_size": 24,
    "color": "#333333",
    "position": {"x": 50, "y": 60},
    "font_family": "Arial, sans-serif",
    "font_weight": "normal"
  }',
  
  -- Date configuration
  date_config JSONB DEFAULT '{
    "font_size": 20,
    "color": "#666666",
    "position": {"x": 50, "y": 75},
    "font_family": "Arial, sans-serif",
    "font_weight": "normal",
    "date_format": "MMMM DD, YYYY"
  }',
  
  -- Certificate dimensions (Landscape orientation - wider than tall)
  width INTEGER DEFAULT 2000,
  height INTEGER DEFAULT 1200,
  
  -- Metadata
  created_by UUID NOT NULL, -- References auth.users(id) from Supabase Auth
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one config per event
  UNIQUE(event_id)
);

-- Enable Row Level Security
ALTER TABLE certificate_configs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_certificate_configs_event_id ON certificate_configs(event_id);
CREATE INDEX IF NOT EXISTS idx_certificate_configs_created_by ON certificate_configs(created_by);

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Organizers can view their event certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Organizers can create certificate configs for their events" ON certificate_configs;
DROP POLICY IF EXISTS "Organizers can update their event certificate configs" ON certificate_configs;
DROP POLICY IF EXISTS "Participants can view certificate configs for registered events" ON certificate_configs;
DROP POLICY IF EXISTS "Admins can manage all certificate configs" ON certificate_configs;

-- RLS Policies
-- Allow organizers to manage their event's certificate config
CREATE POLICY "Organizers can view their event certificate configs"
  ON certificate_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = certificate_configs.event_id
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "Organizers can create certificate configs for their events"
  ON certificate_configs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = certificate_configs.event_id
      AND events.created_by = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Organizers can update their event certificate configs"
  ON certificate_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = certificate_configs.event_id
      AND events.created_by = auth.uid()
    )
  );

-- Allow participants to view certificate configs (for generating certificates)
CREATE POLICY "Participants can view certificate configs for registered events"
  ON certificate_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_registrations
      WHERE event_registrations.event_id = certificate_configs.event_id
      AND event_registrations.user_id = auth.uid()
    )
  );

-- Note: Admin access should be handled via service role or bypass RLS if needed
-- All policies use auth.uid() directly without querying any users table

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_certificate_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_certificate_configs_updated_at
  BEFORE UPDATE ON certificate_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_certificate_configs_updated_at();

-- =====================================================
-- Note: Ensure the 'generated-certificates' storage bucket exists
-- =====================================================

