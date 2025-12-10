-- =====================================================
-- LOGOS TABLE
-- Stores reusable logo images that can be used across multiple certificates
-- =====================================================

CREATE TABLE IF NOT EXISTS logos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- File information
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in storage bucket
  file_name TEXT NOT NULL,
  file_size BIGINT, -- File size in bytes
  mime_type VARCHAR(50), -- image/png, image/jpeg, etc.
  
  -- Logo metadata
  name TEXT, -- Optional: user-friendly name for the logo
  description TEXT, -- Optional: description of the logo
  
  -- Metadata
  uploaded_by UUID NOT NULL, -- References auth.users(id) from Supabase Auth
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE logos ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_logos_uploaded_by ON logos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_logos_uploaded_at ON logos(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_logos_name ON logos(name);

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view all logos" ON logos;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON logos;
DROP POLICY IF EXISTS "Users can update their own logos" ON logos;
DROP POLICY IF EXISTS "Users can delete their own logos" ON logos;
DROP POLICY IF EXISTS "Admins can manage all logos" ON logos;

-- RLS Policies
-- Allow authenticated users to view all logos (for reuse across events)
CREATE POLICY "Authenticated users can view all logos"
  ON logos
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
  ON logos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
  );

-- Allow users to update their own logos
CREATE POLICY "Users can update their own logos"
  ON logos
  FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- Allow users to delete their own logos
CREATE POLICY "Users can delete their own logos"
  ON logos
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Allow admins to manage all logos (if you have an admin role system)
-- Uncomment and adjust if you have an admin role check
-- CREATE POLICY "Admins can manage all logos"
--   ON logos
--   FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM user_roles
--       WHERE user_roles.user_id = auth.uid()
--       AND user_roles.role = 'admin'
--     )
--   );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_logos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_logos_updated_at
  BEFORE UPDATE ON logos
  FOR EACH ROW
  EXECUTE FUNCTION update_logos_updated_at();

-- =====================================================
-- Note: Logos are stored globally and can be reused
-- across multiple events and certificates.
-- =====================================================

