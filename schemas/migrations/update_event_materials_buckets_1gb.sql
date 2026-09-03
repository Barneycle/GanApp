-- =====================================================
-- UPDATE EVENT MATERIALS BUCKETS TO SUPPORT 1GB FILES
-- Updates event-kits and event-programmes buckets to allow 1GB file uploads
-- =====================================================

-- Update event-kits bucket file size limit to 1GB (1073741824 bytes)
UPDATE storage.buckets
SET file_size_limit = 1073741824,
    allowed_mime_types = ARRAY['application/pdf'] -- PDF files only
WHERE id = 'event-kits';

-- If bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-kits',
  'event-kits',
  false, -- Private bucket - authenticated users only
  1073741824, -- 1GB file size limit
  ARRAY['application/pdf'] -- PDF files only
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 1073741824,
    allowed_mime_types = ARRAY['application/pdf'];

-- Update event-programmes bucket file size limit to 1GB
UPDATE storage.buckets
SET file_size_limit = 1073741824,
    allowed_mime_types = ARRAY['application/pdf'] -- PDF files only
WHERE id = 'event-programmes';

-- If bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-programmes',
  'event-programmes',
  false, -- Private bucket - authenticated users only
  1073741824, -- 1GB file size limit
  ARRAY['application/pdf'] -- PDF files only
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 1073741824,
    allowed_mime_types = ARRAY['application/pdf'];

-- Update event-banners bucket file size limit to 1GB (optional, if you want banners to be 1GB too)
UPDATE storage.buckets
SET file_size_limit = 1073741824
WHERE id = 'event-banners';

-- If bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-banners',
  'event-banners',
  true, -- Public bucket so banners can be viewed
  1073741824, -- 1GB file size limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'] -- Image files
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 1073741824;

-- =====================================================
-- Note: Supabase storage supports up to 5GB per file
-- 1GB (1073741824 bytes) is well within the limit
-- =====================================================

