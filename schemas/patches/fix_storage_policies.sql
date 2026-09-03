-- ========================================
-- FIX STORAGE POLICIES - ROLE-BASED ACCESS
-- ========================================
-- This script replaces the current permissive policies with proper role-based restrictions

-- First, drop all existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated reads from certificate-templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from event-kits" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from event-programmes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from speaker-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from sponsor-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to certificate-templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to event-kits" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to event-programmes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to speaker-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to sponsor-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can access event materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can access event programmes" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Certificate Templates" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Event Banners" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Event Materials" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Generated Certificates" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Speaker Photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Sponsor Logos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to User Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload event banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload event materials" ON storage.objects;

-- ========================================
-- 1. EVENT-BANNERS BUCKET POLICIES
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
-- 2. EVENT-KITS BUCKET POLICIES
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
-- 3. SPONSOR-LOGOS BUCKET POLICIES
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
-- 4. SPEAKER-PHOTOS BUCKET POLICIES
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
-- 5. EVENT-PROGRAMMES BUCKET POLICIES
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
-- 6. CERTIFICATE-TEMPLATES BUCKET POLICIES
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
-- 7. EVENT-MATERIALS BUCKET POLICIES (Keep existing for backward compatibility)
-- ========================================

-- Policy: Only admins and organizers can upload to event-materials
CREATE POLICY "event_materials_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-materials' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can update files in event-materials
CREATE POLICY "event_materials_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-materials' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Only admins and organizers can delete files from event-materials
CREATE POLICY "event_materials_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-materials' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Policy: Anyone can view files in event-materials (public read)
CREATE POLICY "event_materials_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'event-materials');

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
