-- Storage Bucket RLS Policies for Admin/Organizer Access Only
-- This file contains policies to restrict file uploads to only admins and organizers

-- Note: RLS is already enabled on storage.objects by default in Supabase
-- We just need to create the policies below

-- ========================================
-- 1. SPONSOR-LOGOS BUCKET POLICIES
-- ========================================

-- Policy: Only admins and organizers can upload to sponsor-logos
CREATE POLICY "sponsor_logos_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'sponsor-logos' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can update files in sponsor-logos
CREATE POLICY "sponsor_logos_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'sponsor-logos' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can delete files from sponsor-logos
CREATE POLICY "sponsor_logos_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'sponsor-logos' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Anyone can view files in sponsor-logos (public read)
CREATE POLICY "sponsor_logos_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'sponsor-logos');

-- ========================================
-- 2. EVENT-BANNERS BUCKET POLICIES
-- ========================================

-- Policy: Only admins and organizers can upload to event-banners
CREATE POLICY "event_banners_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-banners' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can update files in event-banners
CREATE POLICY "event_banners_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-banners' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can delete files from event-banners
CREATE POLICY "event_banners_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-banners' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Anyone can view files in event-banners (public read)
CREATE POLICY "event_banners_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'event-banners');

-- ========================================
-- 3. EVENT-KITS BUCKET POLICIES
-- ========================================

-- Policy: Only admins and organizers can upload to event-kits
CREATE POLICY "event_kits_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-kits' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can update files in event-kits
CREATE POLICY "event_kits_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-kits' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can delete files from event-kits
CREATE POLICY "event_kits_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-kits' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Anyone can view files in event-kits (public read)
CREATE POLICY "event_kits_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'event-kits');

-- ========================================
-- 4. CERTIFICATE-TEMPLATES BUCKET POLICIES
-- ========================================

-- Policy: Only admins and organizers can upload to certificate-templates
CREATE POLICY "certificate_templates_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'certificate-templates' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can update files in certificate-templates
CREATE POLICY "certificate_templates_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'certificate-templates' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can delete files from certificate-templates
CREATE POLICY "certificate_templates_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'certificate-templates' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Anyone can view files in certificate-templates (public read)
CREATE POLICY "certificate_templates_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'certificate-templates');

-- ========================================
-- 5. SPEAKER-PHOTOS BUCKET POLICIES
-- ========================================

-- Policy: Only admins and organizers can upload to speaker-photos
CREATE POLICY "speaker_photos_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'speaker-photos' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can update files in speaker-photos
CREATE POLICY "speaker_photos_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'speaker-photos' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can delete files from speaker-photos
CREATE POLICY "speaker_photos_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'speaker-photos' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Anyone can view files in speaker-photos (public read)
CREATE POLICY "speaker_photos_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'speaker-photos');

-- ========================================
-- 6. EVENT-PROGRAMMES BUCKET POLICIES
-- ========================================

-- Policy: Only admins and organizers can upload to event-programmes
CREATE POLICY "event_programmes_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-programmes' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can update files in event-programmes
CREATE POLICY "event_programmes_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-programmes' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can delete files from event-programmes
CREATE POLICY "event_programmes_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-programmes' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Anyone can view files in event-programmes (public read)
CREATE POLICY "event_programmes_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'event-programmes');

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check if policies were created successfully
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
ORDER BY policyname;

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'objects';
