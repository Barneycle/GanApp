-- =====================================================
-- Migration: Add registration_open field to events table
-- =====================================================
-- Purpose: Allow organizers to open/close registrations
--          for specific events. Default is true (open).
-- =====================================================

-- Add registration_open column to events table (default true - open)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS registration_open BOOLEAN DEFAULT true NOT NULL;

-- Update any existing rows that might have NULL (set to true - open by default)
UPDATE events 
SET registration_open = true 
WHERE registration_open IS NULL;

-- Add registration_open column to archived_events table (default true - open)
ALTER TABLE archived_events 
ADD COLUMN IF NOT EXISTS registration_open BOOLEAN DEFAULT true NOT NULL;

-- Update any existing rows that might have NULL (set to true - open by default)
UPDATE archived_events 
SET registration_open = true 
WHERE registration_open IS NULL;

-- Add comment explaining the field
COMMENT ON COLUMN events.registration_open IS 'Controls whether users can register for this event. Default is true (open). When false, registration is closed.';
