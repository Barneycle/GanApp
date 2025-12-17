-- =====================================================
-- Migration: Change event_chat_settings to be per participant
-- =====================================================
-- Purpose: Change chat settings from per-event to per-participant
--          so organizers can close individual conversation threads
-- =====================================================

-- Drop existing table and recreate with participant_id
DROP TABLE IF EXISTS event_chat_settings CASCADE;

-- Recreate table with composite primary key (event_id + participant_id)
CREATE TABLE event_chat_settings (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_chat_open BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (event_id, participant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_chat_settings_event_id ON event_chat_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_chat_settings_participant_id ON event_chat_settings(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_chat_settings_is_chat_open ON event_chat_settings(is_chat_open);

-- Enable Row Level Security
ALTER TABLE event_chat_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_chat_settings
-- Organizers can view chat settings for their events
CREATE POLICY "Organizers can view event chat settings" ON event_chat_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Participants can view their own chat settings
CREATE POLICY "Participants can view own chat settings" ON event_chat_settings
  FOR SELECT USING (
    participant_id = auth.uid()
  );

-- Organizers can update chat settings for their events
CREATE POLICY "Organizers can update event chat settings" ON event_chat_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Update RLS policy in event_messages to check per-participant chat settings
DROP POLICY IF EXISTS "Participants can send event messages" ON event_messages;

CREATE POLICY "Participants can send event messages" ON event_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    participant_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM event_registrations 
      WHERE event_id = event_messages.event_id 
      AND user_id = auth.uid() 
      AND status = 'registered'
    ) AND
    EXISTS (
      SELECT 1 FROM events WHERE id = event_messages.event_id
    ) AND
    -- Allow if no chat setting exists (defaults to open) OR if setting exists and is open
    (
      NOT EXISTS (
        SELECT 1 FROM event_chat_settings 
        WHERE event_id = event_messages.event_id 
        AND participant_id = event_messages.participant_id
      ) OR
      EXISTS (
        SELECT 1 FROM event_chat_settings 
        WHERE event_id = event_messages.event_id 
        AND participant_id = event_messages.participant_id
        AND is_chat_open = true
      )
    )
  );

-- Add comment
COMMENT ON TABLE event_chat_settings IS 'Tracks chat open/closed status per participant thread. Each row represents one conversation thread between an organizer and a participant for a specific event.';

