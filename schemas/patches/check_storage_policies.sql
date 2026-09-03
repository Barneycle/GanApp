-- ========================================
-- STORAGE POLICY DIAGNOSTIC QUERIES
-- ========================================
-- Run these queries in your Supabase SQL editor to check policy status

-- 1. Check if RLS is enabled on storage.objects
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'objects';

-- 2. List all storage policies
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

-- 3. Check storage buckets
SELECT 
  id,
  name,
  public,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY name;

-- 4. Check if specific buckets exist
SELECT 
  name,
  public,
  created_at
FROM storage.buckets 
WHERE name IN (
  'event-banners',
  'event-kits', 
  'sponsor-logos',
  'speaker-photos',
  'event-programmes',
  'certificate-templates'
);

-- 5. Check user roles in auth.users
SELECT 
  id,
  email,
  raw_user_meta_data,
  (raw_user_meta_data->>'role') as role,
  (raw_user_meta_data->>'user_type') as user_type,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 6. Check user roles in public.users table (if exists)
SELECT 
  id,
  email,
  role,
  user_type,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 7. Test policy evaluation for a specific user
-- Replace 'USER_ID_HERE' with an actual user ID
SELECT 
  auth.uid() as current_user_id,
  auth.role() as auth_role,
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' as jwt_role,
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'user_type' as jwt_user_type;

-- 8. Check if policies are working by testing with a specific bucket
-- This will show what the policy evaluation returns
SELECT 
  'event-banners' as bucket_name,
  auth.role() = 'authenticated' as is_authenticated,
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' as is_admin,
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer' as is_organizer,
  CASE 
    WHEN auth.role() = 'authenticated' AND 
         ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
          (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer')
    THEN 'ALLOWED'
    ELSE 'DENIED'
  END as upload_permission;

-- 9. Check for any storage objects (files) in buckets
SELECT 
  bucket_id,
  name,
  owner,
  created_at,
  updated_at
FROM storage.objects
ORDER BY created_at DESC
LIMIT 20;

-- 10. Count files per bucket
SELECT 
  bucket_id,
  COUNT(*) as file_count
FROM storage.objects
GROUP BY bucket_id
ORDER BY file_count DESC;

-- 11. Check for any orphaned files (files without valid bucket)
SELECT 
  name,
  bucket_id,
  created_at
FROM storage.objects
WHERE bucket_id NOT IN (SELECT id FROM storage.buckets);

-- 12. Test policy with different user contexts
-- This helps identify if the issue is with policy logic
WITH test_users AS (
  SELECT 
    'test-admin' as user_id,
    'admin' as role,
    'psu-employee' as user_type
  UNION ALL
  SELECT 
    'test-organizer' as user_id,
    'organizer' as role,
    'psu-employee' as user_type
  UNION ALL
  SELECT 
    'test-participant' as user_id,
    'participant' as role,
    'psu-student' as user_type
)
SELECT 
  tu.user_id,
  tu.role,
  tu.user_type,
  CASE 
    WHEN tu.role IN ('admin', 'organizer') THEN 'ALLOWED'
    ELSE 'DENIED'
  END as expected_permission
FROM test_users tu;

-- 13. Check if there are any conflicting policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
  AND cmd = 'INSERT'
GROUP BY policyname, cmd, qual, with_check
HAVING COUNT(*) > 1;

-- 14. Verify bucket permissions for authenticated users
SELECT 
  b.name as bucket_name,
  b.public,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies p 
      WHERE p.tablename = 'objects' 
        AND p.cmd = 'INSERT' 
        AND p.with_check LIKE '%' || b.name || '%'
    ) THEN 'HAS_UPLOAD_POLICY'
    ELSE 'NO_UPLOAD_POLICY'
  END as upload_policy_status
FROM storage.buckets b
ORDER BY b.name;
