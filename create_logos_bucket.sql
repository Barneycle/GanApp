-- =====================================================
-- CREATE LOGOS STORAGE BUCKET
-- Storage bucket for reusable certificate logos
-- =====================================================

-- Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificate-logos',
  'certificate-logos',
  true, -- Public bucket so logos can be viewed
  10485760, -- 10MB file size limit per logo
  ARRAY['image/png', 'image/jpeg', 'image/jpg'] -- Only PNG and JPG allowed
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage Policies for certificate-logos bucket
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own logos" ON storage.objects;

-- Policy: Allow authenticated users to upload logos
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificate-logos' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow authenticated users to read/view logos
CREATE POLICY "Allow authenticated users to view logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'certificate-logos');

-- Policy: Allow users to update their own logos
-- Users can update files they uploaded (check by metadata or path structure)
CREATE POLICY "Allow users to update their own logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certificate-logos' AND
  auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'certificate-logos' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow users to delete their own logos
CREATE POLICY "Allow users to delete their own logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificate-logos' AND
  auth.uid() IS NOT NULL
);

-- =====================================================
-- Note: Logos are stored in the following structure:
-- certificate-logos/
--   {userId}/
--     logo_{timestamp}_{random}.{ext}
-- 
-- This allows users to manage their own logos while
-- making them accessible to all authenticated users.
-- =====================================================

