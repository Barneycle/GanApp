-- =====================================================
-- Migration: Add DELETE policies for event_messages
-- =====================================================
-- Purpose: Allow organizers and participants to delete messages
--          in their conversation threads

-- Drop existing DELETE policies if they exist
DROP POLICY IF EXISTS "Participants can delete own event messages" ON event_messages;
DROP POLICY IF EXISTS "Organizers can delete event messages" ON event_messages;

-- Participants can delete all messages in their conversation thread
-- (both their own messages and organizer's messages to them)
CREATE POLICY "Participants can delete own event messages" ON event_messages
  FOR DELETE USING (
    participant_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM event_registrations 
      WHERE event_id = event_messages.event_id 
      AND user_id = auth.uid() 
      AND status = 'registered'
    )
  );

-- Organizers can delete all messages for conversations in their events
-- This allows them to delete entire conversation threads
CREATE POLICY "Organizers can delete event messages" ON event_messages
  FOR DELETE USING (
    organizer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

COMMENT ON POLICY "Participants can delete own event messages" ON event_messages IS 
'Allows participants to delete all messages in their conversation thread with an organizer';

COMMENT ON POLICY "Organizers can delete event messages" ON event_messages IS 
'Allows organizers to delete messages in conversations for their events';
