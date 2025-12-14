-- =====================================================
-- Migration: Add UPDATE policies for attendance_logs
-- =====================================================
-- This migration allows event organizers to update attendance logs
-- (e.g., to validate/unvalidate check-ins)

-- Drop existing UPDATE policies if they exist
DROP POLICY IF EXISTS "Event organizers can update event attendance" ON attendance_logs;

-- Event organizers can update attendance for their events
-- This checks if the authenticated user is the creator of the event
CREATE POLICY "Event organizers can update event attendance" ON attendance_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );
