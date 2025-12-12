-- =====================================================
-- Create unarchive_event function to restore archived events
-- =====================================================

-- Drop existing unarchive_event functions if they exist
DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE proname = 'unarchive_event'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS unarchive_event(' || func_record.args || ') CASCADE';
    END LOOP;
END $$;

-- Create the unarchive_event function to restore archived events
CREATE OR REPLACE FUNCTION unarchive_event(
    archive_id_uuid UUID,
    unarchive_reason_text TEXT DEFAULT NULL,
    unarchived_by_uuid UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    archived_event_record RECORD;
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
    insert_cols TEXT;
    insert_vals TEXT;
BEGIN
    -- Get current user ID (use provided unarchived_by_uuid or auth.uid())
    current_user_id := COALESCE(unarchived_by_uuid, auth.uid());
    
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
            'error', 'Only administrators can unarchive events'
        );
    END IF;
    
    -- Check if archived event exists
    IF NOT EXISTS (SELECT 1 FROM archived_events WHERE id = archive_id_uuid) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Archived event not found'
        );
    END IF;
    
    -- Get archived event data (explicitly select only core columns that definitely exist)
    -- Also get archive_reason and archived_at for logging purposes
    SELECT 
        original_event_id, title, description, rationale,
        start_date, end_date, start_time, end_time,
        venue, max_participants, final_participant_count,
        banner_url,
        status, is_featured,
        created_by, original_created_at, original_updated_at,
        archive_reason, archived_at
    INTO archived_event_record 
    FROM archived_events 
    WHERE id = archive_id_uuid;
    
    -- Check if event already exists in active events (shouldn't happen, but check anyway)
    IF EXISTS (SELECT 1 FROM events WHERE id = archived_event_record.original_event_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Event already exists in active events'
        );
    END IF;
    
    -- Try to get ALL potentially missing columns if they exist (handle gracefully if they don't)
    BEGIN
        EXECUTE format('SELECT venue_address FROM archived_events WHERE id = %L', archive_id_uuid) INTO venue_address_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            venue_address_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT programme_url FROM archived_events WHERE id = %L', archive_id_uuid) INTO programme_url_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            programme_url_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT materials_url FROM archived_events WHERE id = %L', archive_id_uuid) INTO materials_url_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            materials_url_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT sponsors FROM archived_events WHERE id = %L', archive_id_uuid) INTO sponsors_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            sponsors_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT guest_speakers FROM archived_events WHERE id = %L', archive_id_uuid) INTO guest_speakers_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            guest_speakers_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT category FROM archived_events WHERE id = %L', archive_id_uuid) INTO category_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            category_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT event_kits_url FROM archived_events WHERE id = %L', archive_id_uuid) INTO event_kits_url_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            event_kits_url_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT tags FROM archived_events WHERE id = %L', archive_id_uuid) INTO tags_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            tags_value := NULL;
    END;
    
    BEGIN
        EXECUTE format('SELECT registration_deadline FROM archived_events WHERE id = %L', archive_id_uuid) INTO registration_deadline_value;
    EXCEPTION
        WHEN undefined_column OR OTHERS THEN
            registration_deadline_value := NULL;
    END;
    
    -- Build dynamic INSERT statement based on which columns exist in events table
    -- Start with core columns
    insert_cols := 'id, title, description, rationale, start_date, end_date, start_time, end_time, venue, max_participants, current_participants, banner_url, status, is_featured, created_by, created_at, updated_at';
    insert_vals := format('%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L',
        archived_event_record.original_event_id,
        archived_event_record.title,
        archived_event_record.description,
        archived_event_record.rationale,
        archived_event_record.start_date,
        archived_event_record.end_date,
        archived_event_record.start_time,
        archived_event_record.end_time,
        archived_event_record.venue,
        archived_event_record.max_participants,
        COALESCE(archived_event_record.final_participant_count, 0),
        archived_event_record.banner_url,
        archived_event_record.status,
        archived_event_record.is_featured,
        archived_event_record.created_by,
        archived_event_record.original_created_at,
        archived_event_record.original_updated_at
    );
    
    -- Add optional columns if they exist in events table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'venue_address') THEN
        insert_cols := insert_cols || ', venue_address';
        insert_vals := insert_vals || format(', %L', venue_address_value);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'programme_url') THEN
        insert_cols := insert_cols || ', programme_url';
        insert_vals := insert_vals || format(', %L', programme_url_value);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'materials_url') THEN
        insert_cols := insert_cols || ', materials_url';
        insert_vals := insert_vals || format(', %L', materials_url_value);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_kits_url') THEN
        insert_cols := insert_cols || ', event_kits_url';
        insert_vals := insert_vals || format(', %L', event_kits_url_value);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'sponsors') THEN
        insert_cols := insert_cols || ', sponsors';
        insert_vals := insert_vals || format(', %L', sponsors_value);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'guest_speakers') THEN
        insert_cols := insert_cols || ', guest_speakers';
        insert_vals := insert_vals || format(', %L', guest_speakers_value);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'category') THEN
        insert_cols := insert_cols || ', category';
        insert_vals := insert_vals || format(', %L', category_value);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'tags') THEN
        insert_cols := insert_cols || ', tags';
        insert_vals := insert_vals || format(', %L', tags_value);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'registration_deadline') THEN
        insert_cols := insert_cols || ', registration_deadline';
        insert_vals := insert_vals || format(', %L', registration_deadline_value);
    END IF;
    
    -- Execute the dynamic INSERT
    EXECUTE format('INSERT INTO events (%s) VALUES (%s)', insert_cols, insert_vals);
    
    -- Log the unarchive action to activity_logs (if table exists)
    -- Store unarchive_reason separately from archive_reason for proper audit trail
    BEGIN
        EXECUTE format('
            INSERT INTO activity_logs (user_id, action, resource_type, resource_id, resource_name, details)
            VALUES (%L, %L, %L, %L, %L, %L)
        ',
            current_user_id,
            'unarchive',
            'event',
            archived_event_record.original_event_id,
            archived_event_record.title,
            json_build_object(
                'unarchive_reason', unarchive_reason_text,
                'archive_reason', archived_event_record.archive_reason,
                'archived_at', archived_event_record.archived_at
            )::text
        );
    EXCEPTION
        WHEN undefined_table OR OTHERS THEN
            -- Activity logs table doesn't exist, skip logging
            NULL;
    END;
    
    -- Delete from archived_events
    DELETE FROM archived_events WHERE id = archive_id_uuid;
    
    RETURN json_build_object(
        'success', true,
        'event_id', archived_event_record.original_event_id
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
GRANT EXECUTE ON FUNCTION unarchive_event(UUID, TEXT, UUID) TO authenticated;

-- Explicitly grant on public schema
GRANT EXECUTE ON FUNCTION public.unarchive_event(UUID, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION unarchive_event IS 'Unarchive an event (admin only). Restores an archived event back to the active events table. Unarchive reason is optional and can be provided for audit purposes.';

-- Refresh schema cache (this helps Supabase recognize the new function)
NOTIFY pgrst, 'reload schema';
