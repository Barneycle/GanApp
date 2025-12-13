-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own certificates" ON storage.objects;

-- Allow authenticated users to upload certificates to generated-certificates bucket
-- Path format: certificates/{eventId}/{userId}/{fileName}
-- The third folder (index 3) should be the user_id
CREATE POLICY "Users can upload their own certificates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'generated-certificates' AND 
    auth.role() = 'authenticated' AND
    -- Check if path contains their user_id (third folder in path: certificates/eventId/userId/fileName)
    (storage.foldername(name))[3] = auth.uid()::text
  );

-- Allow users to read their own certificates (and public read)
CREATE POLICY "Users can read generated certificates" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'generated-certificates'
  );

-- Allow users to update their own certificates
CREATE POLICY "Users can update their own certificates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'generated-certificates' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[3] = auth.uid()::text
  );

-- Allow users to delete their own certificates
CREATE POLICY "Users can delete their own certificates" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'generated-certificates' AND 
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[3] = auth.uid()::text
  );
