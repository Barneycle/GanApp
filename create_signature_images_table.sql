-- =====================================================
-- SIGNATURE IMAGES TABLE (Optional - for tracking metadata)
-- This table can be used to track signature image metadata
-- separately from the certificate_configs JSONB field
-- =====================================================

CREATE TABLE IF NOT EXISTS signature_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  certificate_config_id UUID NOT NULL REFERENCES certificate_configs(id) ON DELETE CASCADE,
  
  -- Signature block information
  block_index INTEGER NOT NULL, -- Index in the signature_blocks array
  signature_block_id TEXT, -- Optional: unique identifier for the signature block
  
  -- File information
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in storage bucket
  file_name TEXT NOT NULL,
  file_size BIGINT, -- File size in bytes
  mime_type VARCHAR(50), -- image/png, image/jpeg, etc.
  
  -- Metadata
  uploaded_by UUID NOT NULL, -- References auth.users(id) from Supabase Auth
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one signature image per block index per config
  UNIQUE(certificate_config_id, block_index)
);

-- Enable Row Level Security
ALTER TABLE signature_images ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_signature_images_event_id ON signature_images(event_id);
CREATE INDEX IF NOT EXISTS idx_signature_images_certificate_config_id ON signature_images(certificate_config_id);
CREATE INDEX IF NOT EXISTS idx_signature_images_uploaded_by ON signature_images(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_signature_images_block_index ON signature_images(certificate_config_id, block_index);

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Organizers can view signature images for their events" ON signature_images;
DROP POLICY IF EXISTS "Organizers can create signature images for their events" ON signature_images;
DROP POLICY IF EXISTS "Organizers can update signature images for their events" ON signature_images;
DROP POLICY IF EXISTS "Organizers can delete signature images for their events" ON signature_images;
DROP POLICY IF EXISTS "Participants can view signature images for registered events" ON signature_images;

-- RLS Policies
-- Allow organizers to manage signature images for their events
CREATE POLICY "Organizers can view signature images for their events"
  ON signature_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = signature_images.event_id
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "Organizers can create signature images for their events"
  ON signature_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = signature_images.event_id
      AND events.created_by = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Organizers can update signature images for their events"
  ON signature_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = signature_images.event_id
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "Organizers can delete signature images for their events"
  ON signature_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = signature_images.event_id
      AND events.created_by = auth.uid()
    )
  );

-- Allow participants to view signature images (for generating certificates)
CREATE POLICY "Participants can view signature images for registered events"
  ON signature_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_registrations
      WHERE event_registrations.event_id = signature_images.event_id
      AND event_registrations.user_id = auth.uid()
    )
  );

-- Create trigger to update uploaded_at timestamp (if needed in future)
CREATE OR REPLACE FUNCTION update_signature_images_uploaded_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.uploaded_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: uploaded_at is set on INSERT, so we don't need an UPDATE trigger
-- But we can add one if we want to track when images are replaced
CREATE TRIGGER update_signature_images_uploaded_at
  BEFORE UPDATE ON signature_images
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_images_uploaded_at();

-- =====================================================
-- Note: This table is optional. The signature_image_url
-- is already stored in the signature_blocks JSONB array
-- in the certificate_configs table. This table provides
-- additional metadata tracking if needed.
-- =====================================================

