-- =====================================================
-- SURVEY AVAILABILITY CONTROL MIGRATION
-- =====================================================
-- Adds Google Forms-like availability control to surveys
-- Organizers can manually open/close surveys and set schedules

-- Add availability control columns to surveys table
ALTER TABLE surveys 
ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS opens_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS closes_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_surveys_is_open ON surveys(is_open);
CREATE INDEX IF NOT EXISTS idx_surveys_opens_at ON surveys(opens_at);
CREATE INDEX IF NOT EXISTS idx_surveys_closes_at ON surveys(closes_at);
CREATE INDEX IF NOT EXISTS idx_surveys_availability ON surveys(is_open, opens_at, closes_at, is_active);

-- Add a function to check if survey is currently available
CREATE OR REPLACE FUNCTION is_survey_available(survey_row surveys)
RETURNS BOOLEAN AS $$
BEGIN
  -- Survey must be active and open
  IF NOT survey_row.is_active OR NOT survey_row.is_open THEN
    RETURN FALSE;
  END IF;
  
  -- Check if survey has specific open time set
  IF survey_row.opens_at IS NOT NULL AND NOW() < survey_row.opens_at THEN
    RETURN FALSE;
  END IF;
  
  -- Check if survey has specific close time set
  IF survey_row.closes_at IS NOT NULL AND NOW() > survey_row.closes_at THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for survey availability control
-- Organizers can manage their own surveys
CREATE POLICY "Organizers can manage their own surveys" ON surveys
  FOR ALL USING (auth.uid() = created_by);

-- Users can view available surveys for events they're registered for
CREATE POLICY "Users can view available surveys" ON surveys
  FOR SELECT USING (
    is_survey_available(surveys) AND
    EXISTS (
      SELECT 1 FROM event_registrations 
      WHERE event_id = surveys.event_id 
      AND user_id = auth.uid()
    )
  );

-- Update existing survey policies to include availability check
DROP POLICY IF EXISTS "Users can view surveys for their events" ON surveys;
CREATE POLICY "Users can view available surveys for their events" ON surveys
  FOR SELECT USING (
    is_survey_available(surveys) AND
    EXISTS (
      SELECT 1 FROM event_registrations 
      WHERE event_id = surveys.event_id 
      AND user_id = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON COLUMN surveys.is_open IS 'Manual control - organizer can open/close survey instantly';
COMMENT ON COLUMN surveys.opens_at IS 'Optional scheduled opening time';
COMMENT ON COLUMN surveys.closes_at IS 'Optional scheduled closing time';
COMMENT ON FUNCTION is_survey_available IS 'Checks if survey is currently available based on all availability rules';

-- Example: Set default surveys to closed (organizers must manually open them)
-- UPDATE surveys SET is_open = false WHERE is_open IS NULL;
