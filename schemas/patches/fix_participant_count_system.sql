-- Fix the participant count system completely

-- Step 1: Fix current counts to match actual registrations
UPDATE events 
SET current_participants = (
  SELECT COUNT(*) 
  FROM event_registrations 
  WHERE event_registrations.event_id = events.id 
  AND event_registrations.status = 'registered'
);

-- Step 2: Drop and recreate triggers with better logic
DROP TRIGGER IF EXISTS trg_update_event_participants_insert ON event_registrations;
DROP TRIGGER IF EXISTS trg_update_event_participants_update ON event_registrations;
DROP TRIGGER IF EXISTS trg_update_event_participants_delete ON event_registrations;
DROP FUNCTION IF EXISTS update_event_participants();

-- Step 3: Create a robust trigger function
CREATE OR REPLACE FUNCTION update_event_participants()
RETURNS TRIGGER AS $$
DECLARE
    event_id_to_update UUID;
BEGIN
    -- Determine which event to update
    IF TG_OP = 'INSERT' THEN
        event_id_to_update := NEW.event_id;
        -- Only increment if status is 'registered'
        IF NEW.status = 'registered' THEN
            UPDATE events
            SET current_participants = COALESCE(current_participants, 0) + 1
            WHERE id = event_id_to_update;
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        event_id_to_update := NEW.event_id;
        -- Handle status changes
        IF OLD.status = 'registered' AND NEW.status = 'cancelled' THEN
            -- Decrement count
            UPDATE events
            SET current_participants = GREATEST(COALESCE(current_participants, 0) - 1, 0)
            WHERE id = event_id_to_update;
        ELSIF OLD.status = 'cancelled' AND NEW.status = 'registered' THEN
            -- Increment count
            UPDATE events
            SET current_participants = COALESCE(current_participants, 0) + 1
            WHERE id = event_id_to_update;
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        event_id_to_update := OLD.event_id;
        -- Only decrement if the deleted registration was 'registered'
        IF OLD.status = 'registered' THEN
            UPDATE events
            SET current_participants = GREATEST(COALESCE(current_participants, 0) - 1, 0)
            WHERE id = event_id_to_update;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the transaction
        RAISE WARNING 'Error in update_event_participants: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create triggers
CREATE TRIGGER trg_update_event_participants_insert
AFTER INSERT ON event_registrations
FOR EACH ROW EXECUTE FUNCTION update_event_participants();

CREATE TRIGGER trg_update_event_participants_update
AFTER UPDATE ON event_registrations
FOR EACH ROW EXECUTE FUNCTION update_event_participants();

CREATE TRIGGER trg_update_event_participants_delete
AFTER DELETE ON event_registrations
FOR EACH ROW EXECUTE FUNCTION update_event_participants();

-- Step 5: Test the triggers
-- Insert a test registration
INSERT INTO event_registrations (event_id, user_id, status)
VALUES ('b42ddfcb-938a-4e9a-88a4-a11e78d71851', 'test-user-789', 'registered');

-- Check if the trigger fired
SELECT 
  e.id,
  e.title,
  e.current_participants
FROM events e
WHERE e.id = 'b42ddfcb-938a-4e9a-88a4-a11e78d71851';

-- Clean up test data
DELETE FROM event_registrations 
WHERE user_id = 'test-user-789';

-- Step 6: Verify final state
SELECT 
  e.id,
  e.title,
  e.current_participants as db_count,
  COUNT(CASE WHEN er.status = 'registered' THEN 1 END) as actual_registered
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.created_at DESC;
