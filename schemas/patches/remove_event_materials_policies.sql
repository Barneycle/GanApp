-- ========================================
-- REMOVE EVENT-MATERIALS POLICIES
-- ========================================
-- Since event-kits is used instead of event-materials

-- Drop event-materials policies
DROP POLICY IF EXISTS "event_materials_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "event_materials_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "event_materials_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "event_materials_select_policy" ON storage.objects;

-- Verify policies are removed
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%event_materials%'
ORDER BY policyname;

-- Should return no results if policies were successfully removed
