-- Create a simpler, more robust trigger function

-- Step 1: Drop existing triggers and function
DROP TRIGGER IF EXISTS trg_update_event_participants_insert ON event_registrations;
DROP TRIGGER IF EXISTS trg_update_event_participants_update ON event_registrations;
DROP TRIGGER IF EXISTS trg_update_event_participants_delete ON event_registrations;
DROP FUNCTION IF EXISTS update_event_participants();

-- Step 2: Create a simpler trigger function with better error handling
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

-- Step 3: Create triggers
CREATE TRIGGER trg_update_event_participants_insert
AFTER INSERT ON event_registrations
FOR EACH ROW EXECUTE FUNCTION update_event_participants();

CREATE TRIGGER trg_update_event_participants_update
AFTER UPDATE ON event_registrations
FOR EACH ROW EXECUTE FUNCTION update_event_participants();

CREATE TRIGGER trg_update_event_participants_delete
AFTER DELETE ON event_registrations
FOR EACH ROW EXECUTE FUNCTION update_event_participants();

-- Step 4: Fix current counts
UPDATE events 
SET current_participants = (
  SELECT COUNT(*) 
  FROM event_registrations 
  WHERE event_registrations.event_id = events.id 
  AND event_registrations.status = 'registered'
);

-- Step 5: Verify triggers exist
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%participant%';

-- Step 6: Test the trigger with a manual insert
-- First, let's see what events exist
SELECT id, title, current_participants FROM events ORDER BY created_at DESC LIMIT 5;
