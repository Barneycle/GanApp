-- =====================================================
-- Fix: Allow admins to archive any event regardless of status
-- =====================================================

-- Drop all existing archive_event functions with any signature
DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE proname = 'archive_event'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS archive_event(' || func_record.args || ') CASCADE';
    END LOOP;
END $$;

-- First, update the archived_events table constraint to allow any status
ALTER TABLE archived_events 
  DROP CONSTRAINT IF EXISTS archived_events_status_check;

ALTER TABLE archived_events
  ADD CONSTRAINT archived_events_status_check 
  CHECK (status IN ('draft', 'published', 'completed', 'cancelled'));

-- Create the archive_event function to allow archiving any event
CREATE OR REPLACE FUNCTION archive_event(
    event_uuid UUID, 
    archive_reason_text TEXT DEFAULT NULL,
    archived_by_uuid UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    event_record RECORD;
    archive_id UUID;
    admin_check BOOLEAN;
    current_user_id UUID;
    venue_address_value TEXT;
    programme_url_value TEXT;
    materials_url_value TEXT;
    sponsors_value JSONB;
    guest_speakers_value JSONB;
    category_value VARCHAR(100);
    event_kits_url_value TEXT;
    tags_value TEXT[];
    registration_deadline_value TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current user ID (use provided archived_by_uuid or auth.uid())
    current_user_id := COALESCE(archived_by_uuid, auth.uid());
    
    -- Check if the caller is an admin
    BEGIN
        SELECT is_admin(current_user_id) INTO admin_check;
    EXCEPTION
        WHEN OTHERS THEN
            -- Fallback: check auth.users directly
            SELECT EXISTS(
                SELECT 1 FROM auth.users 
                WHERE id = current_user_id 
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
            'error', 'Only administrators can archive events'
        );
    END IF;
    
    -- Check if event exists first
    IF NOT EXISTS (SELECT 1 FROM events WHERE id = event_uuid) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Event not found'
        );
    END IF;
    
    -- Check if event is already archived
    IF EXISTS (SELECT 1 FROM archived_events WHERE original_event_id = event_uuid) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Event is already archived'
        );
    END IF;
    
    -- Get event data (explicitly select only core columns that definitely exist)
    -- Exclude potentially missing columns: venue_address, programme_url, materials_url, 
    -- sponsors, guest_speakers, category, event_kits_url, tags, registration_deadline
    SELECT 
        id, title, description, rationale,
        start_date, end_date, start_time, end_time,
        venue, max_participants, current_participants,
        banner_url,
        status, is_featured,
        created_by, created_at, updated_at
    INTO event_record 
    FROM events 
    WHERE id = event_uuid;
    
    -- Try to get ALL potentially missing columns if they exist (handle gracefully if they don't)
    -- This approach ensures we handle any column that might have been dropped or renamed
    
    BEGIN
        EXECUTE format('SELECT venue_address FROM events WHERE id = %L', event_uuid) INTO venue_address_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            venue_address_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT programme_url FROM events WHERE id = %L', event_uuid) INTO programme_url_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            programme_url_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT materials_url FROM events WHERE id = %L', event_uuid) INTO materials_url_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            materials_url_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT sponsors FROM events WHERE id = %L', event_uuid) INTO sponsors_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            sponsors_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT guest_speakers FROM events WHERE id = %L', event_uuid) INTO guest_speakers_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            guest_speakers_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT category FROM events WHERE id = %L', event_uuid) INTO category_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            category_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT event_kits_url FROM events WHERE id = %L', event_uuid) INTO event_kits_url_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            event_kits_url_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT tags FROM events WHERE id = %L', event_uuid) INTO tags_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            tags_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT registration_deadline FROM events WHERE id = %L', event_uuid) INTO registration_deadline_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            registration_deadline_value := NULL;
    END;
    
    -- Insert into archived_events (allow any status)
    INSERT INTO archived_events (
        original_event_id,
        title, description, rationale,
        start_date, end_date, start_time, end_time,
        venue, venue_address, max_participants, final_participant_count,
        banner_url, programme_url, materials_url, event_kits_url,
        sponsors, guest_speakers, status, category, tags, is_featured,
        registration_deadline, created_by, original_created_at, original_updated_at,
        archive_reason, archived_by
    ) VALUES (
        event_record.id,
        event_record.title, 
        event_record.description, 
        event_record.rationale,
        event_record.start_date, 
        event_record.end_date, 
        event_record.start_time, 
        event_record.end_time,
        event_record.venue, 
        venue_address_value, -- Use separately fetched value or NULL
        event_record.max_participants, 
        event_record.current_participants,
        event_record.banner_url, 
        programme_url_value, -- Use separately fetched value or NULL
        materials_url_value, -- Use separately fetched value or NULL
        event_kits_url_value, -- Use separately fetched value or NULL
        sponsors_value, -- Use separately fetched value or NULL
        guest_speakers_value, -- Use separately fetched value or NULL
        event_record.status, -- Preserve original status
        category_value, -- Use separately fetched value or NULL
        tags_value, -- Use separately fetched value or NULL
        event_record.is_featured,
        registration_deadline_value, -- Use separately fetched value or NULL 
        event_record.created_by, 
        event_record.created_at, 
        event_record.updated_at,
        archive_reason_text, 
        current_user_id
    ) RETURNING id INTO archive_id;
    
    -- Delete from active events
    DELETE FROM events WHERE id = event_uuid;
    
    RETURN json_build_object(
        'success', true,
        'archive_id', archive_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION archive_event(UUID, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION archive_event IS 'Archive an event (admin only). Can archive events with any status.';
