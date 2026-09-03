-- Update existing events with current participant counts
UPDATE events 
SET current_participants = (
  SELECT COUNT(*) 
  FROM event_registrations 
  WHERE event_registrations.event_id = events.id 
  AND event_registrations.status = 'registered'
);

-- Create a function to automatically update current_participants when registrations change
CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'registered' THEN
    UPDATE events 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status = 'registered' AND NEW.status != 'registered' THEN
      UPDATE events 
      SET current_participants = GREATEST(current_participants - 1, 0) 
      WHERE id = NEW.event_id;
    ELSIF OLD.status != 'registered' AND NEW.status = 'registered' THEN
      UPDATE events 
      SET current_participants = current_participants + 1 
      WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'registered' THEN
    UPDATE events 
    SET current_participants = GREATEST(current_participants - 1, 0) 
    WHERE id = OLD.event_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update participant count
DROP TRIGGER IF EXISTS trigger_update_participant_count ON event_registrations;
CREATE TRIGGER trigger_update_participant_count
  AFTER INSERT OR UPDATE OR DELETE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_event_participant_count();
