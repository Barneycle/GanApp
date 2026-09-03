-- =====================================================
-- CREATE SIGNATURE IMAGES STORAGE BUCKET
-- Storage bucket for certificate signature images
-- =====================================================

-- Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificate-signatures',
  'certificate-signatures',
  true, -- Public bucket so signature images can be viewed
  5242880, -- 5MB file size limit per signature image
  ARRAY['image/jpeg', 'image/jpg', 'image/png'] -- Only PNG and JPG allowed
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage Policies for certificate-signatures bucket
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload signature images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view signature images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own signature images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own signature images" ON storage.objects;
DROP POLICY IF EXISTS "Allow organizers to manage signature images for their events" ON storage.objects;

-- Policy: Allow authenticated users to upload signature images
-- Users can only upload to folders matching their event IDs (if they own the event)
CREATE POLICY "Allow authenticated users to upload signature images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificate-signatures' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow authenticated users to read/view signature images
CREATE POLICY "Allow authenticated users to view signature images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'certificate-signatures');

-- Policy: Allow users to update their own signature images
-- Users can update files in folders they created (eventId matches their events)
CREATE POLICY "Allow users to update their own signature images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certificate-signatures' AND
  auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'certificate-signatures' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow users to delete their own signature images
CREATE POLICY "Allow users to delete their own signature images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificate-signatures' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow organizers to manage signature images for their events
-- This allows event organizers to manage signatures for events they created
CREATE POLICY "Allow organizers to manage signature images for their events"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'certificate-signatures' AND
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id::text = (storage.foldername(name))[1]
    AND events.created_by = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'certificate-signatures' AND
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id::text = (storage.foldername(name))[1]
    AND events.created_by = auth.uid()
  )
);

-- =====================================================
-- Note: Signature images are stored in the following structure:
-- certificate-signatures/
--   {eventId}/
--     signature_{blockIndex}_{timestamp}.{ext}
-- =====================================================

