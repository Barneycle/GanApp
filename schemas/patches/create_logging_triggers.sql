-- Create a trigger function with logging to see what's happening

-- Step 1: Drop existing triggers and function
DROP TRIGGER IF EXISTS trg_update_event_participants_insert ON event_registrations;
DROP TRIGGER IF EXISTS trg_update_event_participants_update ON event_registrations;
DROP TRIGGER IF EXISTS trg_update_event_participants_delete ON event_registrations;
DROP FUNCTION IF EXISTS update_event_participants();

-- Step 2: Create a trigger function with logging
CREATE OR REPLACE FUNCTION update_event_participants()
RETURNS TRIGGER AS $$
DECLARE
    event_id_to_update UUID;
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    -- Determine which event to update
    IF TG_OP = 'INSERT' THEN
        event_id_to_update := NEW.event_id;
        RAISE NOTICE 'TRIGGER: INSERT operation for event % with status %', event_id_to_update, NEW.status;
        
        -- Only increment if status is 'registered'
        IF NEW.status = 'registered' THEN
            -- Get current count
            SELECT COALESCE(current_participants, 0) INTO old_count
            FROM events WHERE id = event_id_to_update;
            
            new_count := old_count + 1;
            RAISE NOTICE 'TRIGGER: Updating event % from % to % participants', event_id_to_update, old_count, new_count;
            
            UPDATE events
            SET current_participants = new_count
            WHERE id = event_id_to_update;
            
            RAISE NOTICE 'TRIGGER: Update completed for event %', event_id_to_update;
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        event_id_to_update := NEW.event_id;
        RAISE NOTICE 'TRIGGER: UPDATE operation for event % from status % to %', event_id_to_update, OLD.status, NEW.status;
        
        -- Handle status changes
        IF OLD.status = 'registered' AND NEW.status = 'cancelled' THEN
            -- Decrement count
            SELECT COALESCE(current_participants, 0) INTO old_count
            FROM events WHERE id = event_id_to_update;
            
            new_count := GREATEST(old_count - 1, 0);
            RAISE NOTICE 'TRIGGER: Decrementing event % from % to % participants', event_id_to_update, old_count, new_count;
            
            UPDATE events
            SET current_participants = new_count
            WHERE id = event_id_to_update;
            
        ELSIF OLD.status = 'cancelled' AND NEW.status = 'registered' THEN
            -- Increment count
            SELECT COALESCE(current_participants, 0) INTO old_count
            FROM events WHERE id = event_id_to_update;
            
            new_count := old_count + 1;
            RAISE NOTICE 'TRIGGER: Incrementing event % from % to % participants', event_id_to_update, old_count, new_count;
            
            UPDATE events
            SET current_participants = new_count
            WHERE id = event_id_to_update;
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        event_id_to_update := OLD.event_id;
        RAISE NOTICE 'TRIGGER: DELETE operation for event % with status %', event_id_to_update, OLD.status;
        
        -- Only decrement if the deleted registration was 'registered'
        IF OLD.status = 'registered' THEN
            SELECT COALESCE(current_participants, 0) INTO old_count
            FROM events WHERE id = event_id_to_update;
            
            new_count := GREATEST(old_count - 1, 0);
            RAISE NOTICE 'TRIGGER: Decrementing event % from % to % participants (DELETE)', event_id_to_update, old_count, new_count;
            
            UPDATE events
            SET current_participants = new_count
            WHERE id = event_id_to_update;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the transaction
        RAISE WARNING 'TRIGGER ERROR: %', SQLERRM;
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

-- Step 5: Test the trigger
INSERT INTO event_registrations (event_id, user_id, status)
VALUES ('275e68b8-922d-4e37-8d3a-8ad2976b3329', 'test-user-456', 'registered');

-- Step 6: Check if it worked
SELECT 
  e.id,
  e.title,
  e.current_participants
FROM events e
WHERE e.id = '275e68b8-922d-4e37-8d3a-8ad2976b3329';

-- Step 7: Clean up
DELETE FROM event_registrations 
WHERE user_id = 'test-user-456';
