-- =====================================================
-- UPDATE PHONE COLUMNS TO VARCHAR(11)
-- This script updates existing phone columns in guest_speakers and sponsors tables
-- =====================================================

-- Update guest_speakers table phone column
ALTER TABLE guest_speakers 
ALTER COLUMN phone TYPE VARCHAR(11);

-- Update sponsors table phone column  
ALTER TABLE sponsors 
ALTER COLUMN phone TYPE VARCHAR(11);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check the updated column types
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name IN ('guest_speakers', 'sponsors') 
AND column_name = 'phone'
ORDER BY table_name;

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'PHONE COLUMNS UPDATED SUCCESSFULLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'guest_speakers.phone: VARCHAR(11)';
    RAISE NOTICE 'sponsors.phone: VARCHAR(11)';
    RAISE NOTICE '=====================================================';
END $$;
