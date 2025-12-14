-- =====================================================
-- Migration: Add check_in_date to attendance_logs for multi-day event support
-- =====================================================
-- This migration allows users to check in once per day for multi-day events
-- instead of only once per event.

-- Step 1: Add check_in_date column
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS check_in_date DATE;

-- Step 2: Populate check_in_date for existing records
UPDATE attendance_logs 
SET check_in_date = DATE(check_in_time)
WHERE check_in_date IS NULL;

-- Step 3: Set check_in_date to NOT NULL with default
ALTER TABLE attendance_logs 
ALTER COLUMN check_in_date SET DEFAULT CURRENT_DATE,
ALTER COLUMN check_in_date SET NOT NULL;

-- Step 4: Drop the old unique constraint
ALTER TABLE attendance_logs 
DROP CONSTRAINT IF EXISTS attendance_logs_event_id_user_id_key;

-- Step 5: Add new unique constraint for (event_id, user_id, check_in_date)
ALTER TABLE attendance_logs 
ADD CONSTRAINT attendance_logs_event_user_date_unique 
UNIQUE(event_id, user_id, check_in_date);

-- Step 6: Add index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_logs_event_user_date 
ON attendance_logs(event_id, user_id, check_in_date);

-- Step 7: Add index on check_in_date for date-based queries
CREATE INDEX IF NOT EXISTS idx_attendance_logs_check_in_date 
ON attendance_logs(check_in_date);

