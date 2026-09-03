-- =====================================================
-- FIX EVENT CANCELLATION REQUESTS TABLE
-- =====================================================
-- This script fixes the event_cancellation_requests table
-- to work with Supabase Auth (removes dependency on users table)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Organizers can view own cancellation requests" ON event_cancellation_requests;
DROP POLICY IF EXISTS "Organizers can create cancellation requests for their events" ON event_cancellation_requests;
DROP POLICY IF EXISTS "Admins can view all cancellation requests" ON event_cancellation_requests;
DROP POLICY IF EXISTS "Admins can update cancellation requests" ON event_cancellation_requests;

-- Drop foreign key constraint to users table if it exists
ALTER TABLE event_cancellation_requests 
  DROP CONSTRAINT IF EXISTS event_cancellation_requests_requested_by_fkey;

ALTER TABLE event_cancellation_requests 
  DROP CONSTRAINT IF EXISTS event_cancellation_requests_reviewed_by_fkey;

-- =====================================================
-- HELPER FUNCTION: Check if user is admin
-- =====================================================
-- Reuse is_admin function if it exists, otherwise create it
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT COALESCE(
    (raw_user_meta_data->>'role')::text,
    (raw_app_meta_data->>'role')::text,
    'participant'
  )
  INTO user_role
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_role = 'admin';
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Organizers can view their own cancellation requests
CREATE POLICY "Organizers can view own cancellation requests"
  ON event_cancellation_requests
  FOR SELECT
  USING (
    requested_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_cancellation_requests.event_id 
      AND created_by = auth.uid()
    )
  );

-- Organizers can create cancellation requests for their events
CREATE POLICY "Organizers can create cancellation requests for their events"
  ON event_cancellation_requests
  FOR INSERT
  WITH CHECK (
    requested_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_cancellation_requests.event_id 
      AND created_by = auth.uid()
    )
  );

-- Admins can view all cancellation requests
CREATE POLICY "Admins can view all cancellation requests"
  ON event_cancellation_requests
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Admins can update cancellation requests
CREATE POLICY "Admins can update cancellation requests"
  ON event_cancellation_requests
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- VERIFY SETUP
-- =====================================================
DO $$
DECLARE
  policy_count INTEGER;
  policy_name TEXT;
BEGIN
  -- Check if is_admin function exists
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE NOTICE '✓ is_admin function exists';
  ELSE
    RAISE WARNING '✗ is_admin function NOT found';
  END IF;
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'event_cancellation_requests';
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✓ % policies created for event_cancellation_requests', policy_count;
  ELSE
    RAISE WARNING '✗ Only % policies found (expected at least 4)', policy_count;
  END IF;
  
  -- List all policies
  RAISE NOTICE 'Policies on event_cancellation_requests:';
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'event_cancellation_requests'
  LOOP
    RAISE NOTICE '  - %', policy_name;
  END LOOP;
END $$;

-- =====================================================
-- FIX REVIEW CANCELLATION REQUEST FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION review_cancellation_request(
    request_uuid UUID,
    new_status_text VARCHAR(20),
    reviewed_by_uuid UUID,
    review_notes_text TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    admin_check BOOLEAN;
    request_record RECORD;
    event_record RECORD;
BEGIN
    -- Check if the caller is an admin using is_admin function
    SELECT is_admin(reviewed_by_uuid) INTO admin_check;
    
    IF NOT admin_check THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only administrators can review cancellation requests'
        );
    END IF;
    
    -- Validate status
    IF new_status_text NOT IN ('approved', 'declined') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid status. Must be approved or declined'
        );
    END IF;
    
    -- Get request details
    SELECT * INTO request_record FROM event_cancellation_requests WHERE id = request_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cancellation request not found'
        );
    END IF;
    
    -- Check if request is already reviewed
    IF request_record.status != 'pending' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Request has already been reviewed'
        );
    END IF;
    
    -- Get event details
    SELECT * INTO event_record FROM events WHERE id = request_record.event_id;
    
    -- Update request status
    UPDATE event_cancellation_requests SET
        status = new_status_text,
        reviewed_by = reviewed_by_uuid,
        review_notes = review_notes_text,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = request_uuid;
    
    -- If approved, cancel the event (but don't archive - admins can archive manually later)
    IF new_status_text = 'approved' THEN
        -- Update status to cancelled
        UPDATE events SET
            status = 'cancelled',
            updated_at = NOW()
        WHERE id = request_record.event_id;
        
        -- Note: Event remains in events table and will appear in "Cancelled" category
        -- Admins can manually archive cancelled events if needed
    END IF;
    
    -- Build result
    result = json_build_object(
        'success', true,
        'message', 'Cancellation request ' || new_status_text || ' successfully',
        'request_id', request_uuid,
        'event_id', request_record.event_id,
        'event_title', COALESCE(event_record.title, 'Unknown Event'),
        'new_status', new_status_text,
        'review_notes', review_notes_text,
        'reviewed_by', reviewed_by_uuid,
        'reviewed_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION review_cancellation_request(UUID, VARCHAR, UUID, TEXT) TO authenticated;

