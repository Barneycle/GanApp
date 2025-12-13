-- Fix RLS policy for generated-certificates bucket uploads
-- Allow authenticated users to upload their own certificates

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can read generated certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Organizers and admins can upload generated certificates" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Generated Certificates" ON storage.objects;

-- Allow authenticated users to upload certificates to generated-certificates bucket
-- Path format: certificates/{eventId}/{userId}/{fileName} OR certificates/{fileName}
-- This allows both path structures for flexibility
CREATE POLICY "Users can upload their own certificates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'generated-certificates' AND 
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL
  );

-- Allow users to read generated certificates (public read)
CREATE POLICY "Users can read generated certificates" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'generated-certificates'
  );

-- Allow users to update their own certificates
CREATE POLICY "Users can update their own certificates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'generated-certificates' AND 
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL
  );

-- Allow users to delete their own certificates
CREATE POLICY "Users can delete their own certificates" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'generated-certificates' AND 
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL
  );

