-- =====================================================
-- ADD MISSING COLUMNS TO QR_CODES TABLE
-- =====================================================

-- Add check-in window columns to existing qr_codes table
ALTER TABLE qr_codes 
ADD COLUMN IF NOT EXISTS check_in_before_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS check_in_during_minutes INTEGER DEFAULT 30;

-- Add other missing columns that might be needed
ALTER TABLE qr_codes 
ADD COLUMN IF NOT EXISTS requires_location_validation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP WITH TIME ZONE;

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'qr_codes' 
ORDER BY ordinal_position;
