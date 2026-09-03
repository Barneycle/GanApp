-- =====================================================
-- Migration: Create event messages for organizer-participant communication
-- =====================================================
-- Similar to support tickets but event-specific and simpler

-- Event Chat Settings Table (to track if chat is open/closed per event)
CREATE TABLE IF NOT EXISTS event_chat_settings (
  event_id UUID NOT NULL PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  is_chat_open BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Event Messages Table (simpler than support tickets - just messages)
CREATE TABLE IF NOT EXISTS event_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_messages_event_id ON event_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_event_messages_participant_id ON event_messages(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_messages_organizer_id ON event_messages(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_messages_sender_id ON event_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_event_messages_created_at ON event_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_messages_read_at ON event_messages(read_at);

-- Enable Row Level Security
ALTER TABLE event_chat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_chat_settings
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organizers can view event chat settings" ON event_chat_settings;
DROP POLICY IF EXISTS "Organizers can update event chat settings" ON event_chat_settings;
DROP POLICY IF EXISTS "Organizers can insert event chat settings" ON event_chat_settings;
DROP POLICY IF EXISTS "Participants can view event chat settings" ON event_chat_settings;

-- Organizers can view and update chat settings for their events
CREATE POLICY "Organizers can view event chat settings" ON event_chat_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Organizers can update event chat settings" ON event_chat_settings
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

CREATE POLICY "Organizers can insert event chat settings" ON event_chat_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Participants can view chat settings to see if chat is open
CREATE POLICY "Participants can view event chat settings" ON event_chat_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_registrations 
      WHERE event_id = event_chat_settings.event_id 
      AND user_id = auth.uid() 
      AND status = 'registered'
    )
  );

-- RLS Policies for event_messages
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Participants can view own event messages" ON event_messages;
DROP POLICY IF EXISTS "Organizers can view event messages" ON event_messages;
DROP POLICY IF EXISTS "Participants can send event messages" ON event_messages;
DROP POLICY IF EXISTS "Organizers can send event messages" ON event_messages;
DROP POLICY IF EXISTS "Organizers can update event messages" ON event_messages;

-- Participants can view messages for events they're registered for
CREATE POLICY "Participants can view own event messages" ON event_messages
  FOR SELECT USING (
    participant_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM event_registrations 
      WHERE event_id = event_messages.event_id 
      AND user_id = auth.uid() 
      AND status = 'registered'
    )
  );

-- Organizers can view messages for their events
CREATE POLICY "Organizers can view event messages" ON event_messages
  FOR SELECT USING (
    organizer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Participants can send messages for events they're registered for (only if chat is open)
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
    EXISTS (
      SELECT 1 FROM event_chat_settings 
      WHERE event_id = event_messages.event_id 
      AND participant_id = event_messages.participant_id
      AND is_chat_open = true
    )
  );

-- Organizers can send messages for their events
CREATE POLICY "Organizers can send event messages" ON event_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    organizer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Organizers can mark messages as read
CREATE POLICY "Organizers can update event messages" ON event_messages
  FOR UPDATE USING (
    organizer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );
