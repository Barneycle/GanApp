-- =====================================================
-- Fix: Remove automatic archiving from cancellation requests
-- When a cancellation request is approved, the event should
-- only be marked as 'cancelled', not automatically archived.
-- Admins can manually archive cancelled events if needed.
-- =====================================================

-- Update the review_cancellation_request function to remove archiving logic
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
    -- Check if the caller is an admin using is_admin function (if available)
    -- Otherwise fall back to checking users table
    BEGIN
        SELECT is_admin(reviewed_by_uuid) INTO admin_check;
    EXCEPTION
        WHEN OTHERS THEN
            -- Fallback: check users table directly
            SELECT EXISTS(
                SELECT 1 FROM auth.users 
                WHERE id = reviewed_by_uuid 
                AND COALESCE(
                    (raw_user_meta_data->>'role')::text,
                    (raw_app_meta_data->>'role')::text,
                    'participant'
                ) = 'admin'
            ) INTO admin_check;
    END;
    
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

COMMENT ON FUNCTION review_cancellation_request IS 'Review event cancellation requests. When approved, events are marked as cancelled but NOT automatically archived. Admins can manually archive cancelled events if needed.';
