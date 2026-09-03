-- =====================================================
-- BACKGROUND IMAGES TABLE
-- Stores reusable background images that can be used across multiple certificates
-- =====================================================

CREATE TABLE IF NOT EXISTS background_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- File information
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in storage bucket
  file_name TEXT NOT NULL,
  file_size BIGINT, -- File size in bytes
  mime_type VARCHAR(50), -- image/png, image/jpeg, etc.
  
  -- Background metadata
  name TEXT, -- Optional: user-friendly name for the background
  description TEXT, -- Optional: description of the background
  
  -- Metadata
  uploaded_by UUID NOT NULL, -- References auth.users(id) from Supabase Auth
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE background_images ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_background_images_uploaded_by ON background_images(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_background_images_uploaded_at ON background_images(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_background_images_name ON background_images(name);

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view all background images" ON background_images;
DROP POLICY IF EXISTS "Authenticated users can upload background images" ON background_images;
DROP POLICY IF EXISTS "Users can update their own background images" ON background_images;
DROP POLICY IF EXISTS "Users can delete their own background images" ON background_images;
DROP POLICY IF EXISTS "Admins can manage all background images" ON background_images;

-- RLS Policies
-- Allow authenticated users to view all background images (for reuse across events)
CREATE POLICY "Authenticated users can view all background images"
  ON background_images
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to upload background images
CREATE POLICY "Authenticated users can upload background images"
  ON background_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
  );

-- Allow users to update their own background images
CREATE POLICY "Users can update their own background images"
  ON background_images
  FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- Allow users to delete their own background images
CREATE POLICY "Users can delete their own background images"
  ON background_images
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_background_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_background_images_updated_at
  BEFORE UPDATE ON background_images
  FOR EACH ROW
  EXECUTE FUNCTION update_background_images_updated_at();

-- =====================================================
-- Note: Background images are stored globally and can be reused
-- across multiple events and certificates.
-- =====================================================

