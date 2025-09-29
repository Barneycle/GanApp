-- Fix existing surveys that are missing required fields
-- This adds the missing is_open, opens_at, closes_at fields to existing surveys

-- Add missing columns to surveys table if they don't exist
DO $$ 
BEGIN
    -- Check and add is_open column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surveys' AND column_name = 'is_open'
    ) THEN
        ALTER TABLE surveys ADD COLUMN is_open BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Check and add opens_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surveys' AND column_name = 'opens_at'
    ) THEN
        ALTER TABLE surveys ADD COLUMN opens_at TIMESTAMPTZ;
    END IF;
    
    -- Check and add closes_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surveys' AND column_name = 'closes_at'
    ) THEN
        ALTER TABLE surveys ADD COLUMN closes_at TIMESTAMPTZ;
    END IF;
    
    -- Check and add is_active column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surveys' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE surveys ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Update existing surveys to have default values for the new fields
UPDATE surveys 
SET 
    is_open = CASE 
        WHEN is_open IS NULL THEN TRUE 
        ELSE is_open 
    END,
    opens_at = CASE 
        WHEN opens_at IS NULL THEN NULL 
        ELSE opens_at 
    END,
    closes_at = CASE 
        WHEN closes_at IS NULL THEN NULL 
        ELSE closes_at 
    END,
    is_active = CASE 
        WHEN is_active IS NULL THEN TRUE 
        ELSE is_active 
    END;

-- Verify the changes
SELECT @@, title, is_open, is_active, opens_at, closes_at 
FROM surveys 
ORDER BY created_at DESC;
