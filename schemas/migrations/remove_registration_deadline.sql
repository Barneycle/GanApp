-- =====================================================
-- Migration: Remove registration_deadline column
-- =====================================================
-- Purpose: Remove registration deadline functionality completely
--          from both events and archived_events tables
-- =====================================================

-- Drop the column from events table
ALTER TABLE events 
DROP COLUMN IF EXISTS registration_deadline;

-- Drop the column from archived_events table
ALTER TABLE archived_events 
DROP COLUMN IF EXISTS registration_deadline;
