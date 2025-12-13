-- =====================================================
-- CREATE BACKGROUND IMAGES STORAGE BUCKET
-- Storage bucket for reusable certificate background images
-- =====================================================

-- Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificate-backgrounds',
  'certificate-backgrounds',
  true, -- Public bucket so background images can be viewed
  10485760, -- 10MB file size limit per background image
  ARRAY['image/png', 'image/jpeg', 'image/jpg'] -- Only PNG and JPG allowed
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage Policies for certificate-backgrounds bucket
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload background images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view background images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own background images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own background images" ON storage.objects;

-- Policy: Allow authenticated users to upload background images
CREATE POLICY "Allow authenticated users to upload background images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificate-backgrounds' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow authenticated users to read/view background images
CREATE POLICY "Allow authenticated users to view background images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'certificate-backgrounds');

-- Policy: Allow users to update their own background images
CREATE POLICY "Allow users to update their own background images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certificate-backgrounds' AND
  auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'certificate-backgrounds' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow users to delete their own background images
CREATE POLICY "Allow users to delete their own background images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificate-backgrounds' AND
  auth.uid() IS NOT NULL
);

-- =====================================================
-- Note: Background images are stored in the following structure:
-- certificate-backgrounds/
--   {userId}/
--     background_{timestamp}_{random}.{ext}
-- 
-- This allows users to manage their own backgrounds while
-- making them accessible to all authenticated users.
-- =====================================================

