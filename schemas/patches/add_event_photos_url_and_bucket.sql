-- =====================================================
-- Add event_photos_url column to Events table
-- Create event-photos storage bucket
-- =====================================================

-- Add event_photos_url column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS event_photos_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN events.event_photos_url IS 'URL to the event photos album/gallery';

-- =====================================================
-- Create event-photos storage bucket
-- =====================================================

-- Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-photos',
  'event-photos',
  true, -- Public bucket so photos can be viewed
  10485760, -- 10MB file size limit per photo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage Policies for event-photos bucket
-- =====================================================

-- Policy: Allow authenticated users to upload photos
CREATE POLICY "Allow authenticated users to upload event photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-photos' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow authenticated users to read/view photos
CREATE POLICY "Allow authenticated users to view event photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'event-photos');

-- Policy: Allow users to update their own photos
CREATE POLICY "Allow users to update their own event photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'event-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own photos
CREATE POLICY "Allow users to delete their own event photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow organizers and admins to manage all event photos
CREATE POLICY "Allow organizers and admins to manage all event photos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'event-photos' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
)
WITH CHECK (
  bucket_id = 'event-photos' AND
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- =====================================================
-- Optional: Create event_photos table for tracking
-- =====================================================

-- Create event_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_url_public TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_user_id ON event_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_user ON event_photos(event_id, user_id);

-- Add RLS policies for event_photos table
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all event photos
CREATE POLICY "Users can view all event photos"
ON event_photos
FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can insert their own photos
CREATE POLICY "Users can insert their own event photos"
ON event_photos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own photos
CREATE POLICY "Users can update their own event photos"
ON event_photos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete their own event photos"
ON event_photos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Organizers and admins can manage all event photos
CREATE POLICY "Organizers and admins can manage all event photos"
ON event_photos
FOR ALL
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer'
  )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_event_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_photos_updated_at
BEFORE UPDATE ON event_photos
FOR EACH ROW
EXECUTE FUNCTION update_event_photos_updated_at();

-- =====================================================
-- Migration Complete
-- =====================================================

-- Display confirmation
DO $$
BEGIN
    RAISE NOTICE 'Migration complete!';
    RAISE NOTICE 'Added event_photos_url column to events table';
    RAISE NOTICE 'Created event-photos storage bucket';
    RAISE NOTICE 'Created event_photos table for tracking';
    RAISE NOTICE 'Configured RLS policies for storage and table';
END $$;

