-- Fix the participant count issue - no triggers exist!

-- Step 1: Create the function to update participant counts
CREATE OR REPLACE FUNCTION update_event_participants()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment count for new registration
        UPDATE events
        SET current_participants = COALESCE(current_participants, 0) + 1
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status change from 'registered' to 'cancelled'
        IF OLD.status = 'registered' AND NEW.status = 'cancelled' THEN
            UPDATE events
            SET current_participants = GREATEST(COALESCE(current_participants, 0) - 1, 0)
            WHERE id = OLD.event_id;
        -- Handle status change from 'cancelled' to 'registered'
        ELSIF OLD.status = 'cancelled' AND NEW.status = 'registered' THEN
            UPDATE events
            SET current_participants = COALESCE(current_participants, 0) + 1
            WHERE id = OLD.event_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement count for deleted registration if it was 'registered'
        IF OLD.status = 'registered' THEN
            UPDATE events
            SET current_participants = GREATEST(COALESCE(current_participants, 0) - 1, 0)
            WHERE id = OLD.event_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create triggers
CREATE TRIGGER trg_update_event_participants_insert
AFTER INSERT ON event_registrations
FOR EACH ROW EXECUTE FUNCTION update_event_participants();

CREATE TRIGGER trg_update_event_participants_update
AFTER UPDATE OF status ON event_registrations
FOR EACH ROW EXECUTE FUNCTION update_event_participants();

CREATE TRIGGER trg_update_event_participants_delete
AFTER DELETE ON event_registrations
FOR EACH ROW EXECUTE FUNCTION update_event_participants();

-- Step 3: Fix current participant counts
UPDATE events 
SET current_participants = (
  SELECT COUNT(*) 
  FROM event_registrations 
  WHERE event_registrations.event_id = events.id 
  AND event_registrations.status = 'registered'
);

-- Step 4: Verify triggers were created
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%participant%';

-- Step 5: Verify participant counts are fixed
SELECT 
  e.id,
  e.title,
  e.current_participants,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered,
  COUNT(CASE WHEN er.status = 'cancelled' THEN 1 END) as actual_cancelled
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.created_at DESC;
