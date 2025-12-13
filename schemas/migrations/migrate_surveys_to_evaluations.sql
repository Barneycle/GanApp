-- =====================================================
-- MIGRATION: Rename surveys to evaluations
-- =====================================================
-- This script migrates all survey-related tables, columns, 
-- indexes, triggers, functions, and policies to use 
-- "evaluation" terminology instead of "survey"
-- =====================================================

BEGIN;

-- =====================================================
-- 1. RENAME TABLES
-- =====================================================

-- Rename surveys table to evaluations
ALTER TABLE IF EXISTS surveys RENAME TO evaluations;

-- Rename survey_responses table to evaluation_responses
ALTER TABLE IF EXISTS survey_responses RENAME TO evaluation_responses;

-- =====================================================
-- 2. RENAME COLUMNS
-- =====================================================

-- Rename survey_id column in evaluation_responses
ALTER TABLE IF EXISTS evaluation_responses 
    RENAME COLUMN survey_id TO evaluation_id;

-- Rename survey_notifications column in notification_preferences
ALTER TABLE IF EXISTS notification_preferences 
    RENAME COLUMN survey_notifications TO evaluation_notifications;

-- Check if attendance_logs has survey_id or survey_response_id columns and rename them
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_logs' 
        AND column_name = 'survey_id'
    ) THEN
        ALTER TABLE attendance_logs RENAME COLUMN survey_id TO evaluation_id;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_logs' 
        AND column_name = 'survey_response_id'
    ) THEN
        ALTER TABLE attendance_logs RENAME COLUMN survey_response_id TO evaluation_response_id;
    END IF;
END $$;

-- =====================================================
-- 3. UPDATE FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Drop and recreate foreign key constraint in evaluation_responses
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    -- Find the foreign key constraint name
    SELECT constraint_name INTO fk_name
    FROM information_schema.table_constraints
    WHERE table_name = 'evaluation_responses'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%survey%';
    
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE evaluation_responses DROP CONSTRAINT IF EXISTS ' || fk_name;
    END IF;
END $$;

-- Recreate foreign key with new name
ALTER TABLE evaluation_responses
    ADD CONSTRAINT fk_evaluation_responses_evaluation_id 
    FOREIGN KEY (evaluation_id) 
    REFERENCES evaluations(id) 
    ON DELETE CASCADE;

-- Update foreign keys in attendance_logs if they exist
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    -- Handle evaluation_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_logs' 
        AND column_name = 'evaluation_id'
    ) THEN
        -- Find and drop old foreign key constraint
        SELECT constraint_name INTO fk_name
        FROM information_schema.table_constraints
        WHERE table_name = 'attendance_logs'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%survey%';
        
        IF fk_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE attendance_logs DROP CONSTRAINT IF EXISTS ' || fk_name;
        END IF;
        
        -- Recreate foreign key
        ALTER TABLE attendance_logs
            ADD CONSTRAINT fk_attendance_logs_evaluation_id 
            FOREIGN KEY (evaluation_id) 
            REFERENCES evaluations(id) 
            ON DELETE SET NULL;
    END IF;
    
    -- Handle evaluation_response_id foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_logs' 
        AND column_name = 'evaluation_response_id'
    ) THEN
        -- Find and drop old foreign key constraint
        SELECT constraint_name INTO fk_name
        FROM information_schema.table_constraints
        WHERE table_name = 'attendance_logs'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%survey_response%';
        
        IF fk_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE attendance_logs DROP CONSTRAINT IF EXISTS ' || fk_name;
        END IF;
        
        -- Recreate foreign key
        ALTER TABLE attendance_logs
            ADD CONSTRAINT fk_attendance_logs_evaluation_response_id 
            FOREIGN KEY (evaluation_response_id) 
            REFERENCES evaluation_responses(id) 
            ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- 4. UPDATE UNIQUE CONSTRAINTS
-- =====================================================

-- Drop and recreate unique constraint in evaluation_responses
DO $$
DECLARE
    uk_name TEXT;
BEGIN
    -- Find the unique constraint name
    SELECT constraint_name INTO uk_name
    FROM information_schema.table_constraints
    WHERE table_name = 'evaluation_responses'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%survey%';
    
    IF uk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE evaluation_responses DROP CONSTRAINT IF EXISTS ' || uk_name;
    END IF;
END $$;

-- Recreate unique constraint
ALTER TABLE evaluation_responses
    ADD CONSTRAINT unique_evaluation_user 
    UNIQUE (evaluation_id, user_id);

-- =====================================================
-- 5. RENAME INDEXES
-- =====================================================

-- Rename indexes for evaluations table
ALTER INDEX IF EXISTS idx_surveys_event_id RENAME TO idx_evaluations_event_id;
ALTER INDEX IF EXISTS idx_surveys_is_active RENAME TO idx_evaluations_is_active;
ALTER INDEX IF EXISTS idx_surveys_event_active RENAME TO idx_evaluations_event_active;
ALTER INDEX IF EXISTS idx_surveys_created_by_active RENAME TO idx_evaluations_created_by_active;

-- Rename indexes for evaluation_responses table
ALTER INDEX IF EXISTS idx_survey_responses_survey_id RENAME TO idx_evaluation_responses_evaluation_id;
ALTER INDEX IF EXISTS idx_survey_responses_survey_user RENAME TO idx_evaluation_responses_evaluation_user;

-- Note: Other indexes like idx_survey_responses_user_id don't need renaming
-- as they don't contain "survey" in the name

-- =====================================================
-- 6. UPDATE TRIGGERS
-- =====================================================

-- Drop old trigger
DROP TRIGGER IF EXISTS trg_notify_survey_availability ON evaluations;

-- Recreate trigger with new name
CREATE TRIGGER trg_notify_evaluation_availability
    AFTER INSERT OR UPDATE OF is_active ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION notify_survey_availability(); -- Function will be updated below

-- =====================================================
-- 7. UPDATE FUNCTIONS
-- =====================================================

-- Update notify_survey_availability function
CREATE OR REPLACE FUNCTION notify_survey_availability()
RETURNS TRIGGER AS $$
DECLARE
    event_title TEXT;
    survey_event_id UUID;
    user_record RECORD;
BEGIN
    -- Only proceed if survey is being activated
    IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
        -- Get event information
        SELECT e.title, e.id INTO event_title, survey_event_id
        FROM events e
        WHERE e.id = NEW.event_id;
        
        -- If no event found, exit
        IF event_title IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Notify all registered users for this event
        FOR user_record IN
            SELECT er.user_id
            FROM event_registrations er
            WHERE er.event_id = survey_event_id
                AND er.status = 'registered'
                -- Check if user has notification preferences enabled
                AND EXISTS (
                    SELECT 1 FROM notification_preferences np
                    WHERE np.user_id = er.user_id
                        AND np.evaluation_notifications = true
                )
                -- Check if user hasn't already completed this evaluation
                AND NOT EXISTS (
                    SELECT 1 FROM evaluation_responses er2
                    WHERE er2.evaluation_id = NEW.id
                        AND er2.user_id = er.user_id
                )
                -- Check if notification hasn't been sent already (avoid duplicates)
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n
                    WHERE n.user_id = er.user_id
                        AND n.title = 'Evaluation Available'
                        AND n.message LIKE '%' || event_title || '%'
                        AND n.created_at > NOW() - INTERVAL '1 hour'
                )
        LOOP
            BEGIN
                -- Create notification for this user
                INSERT INTO notifications (
                    user_id,
                    title,
                    message,
                    type,
                    priority,
                    action_url,
                    action_text,
                    expires_at
                ) VALUES (
                    user_record.user_id,
                    'Evaluation Available',
                    'An evaluation is now available for "' || event_title || '". Please share your feedback!',
                    'info',
                    'normal',
                    '/evaluation?id=' || NEW.id,
                    'Take Evaluation',
                    NULL -- Expire when evaluation closes (if applicable)
                );
            EXCEPTION WHEN OTHERS THEN
                -- Log error but continue processing
                RAISE WARNING 'Error creating evaluation notification for user %: %', 
                    user_record.user_id, SQLERRM;
            END;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rename the function to match new naming
ALTER FUNCTION notify_survey_availability() RENAME TO notify_evaluation_availability;

-- Update trigger to use new function name
DROP TRIGGER IF EXISTS trg_notify_evaluation_availability ON evaluations;
CREATE TRIGGER trg_notify_evaluation_availability
    AFTER INSERT OR UPDATE OF is_active ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION notify_evaluation_availability();

-- Update generate_certificate function
CREATE OR REPLACE FUNCTION generate_certificate(
    event_uuid UUID,
    user_uuid UUID
)
RETURNS JSONB AS $$
DECLARE
    user_record RECORD;
    attendance_record RECORD;
    evaluation_response_record RECORD;
    event_record RECORD;
    cert_config_record RECORD;
    participant_name TEXT := '';
    first_name TEXT;
    last_name TEXT;
    certificate_url TEXT;
    certificate_data JSONB;
BEGIN
    -- Get user data
    SELECT * INTO user_record FROM users WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Get event data
    SELECT * INTO event_record FROM events WHERE id = event_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Event not found');
    END IF;
    
    -- Get attendance and evaluation data
    SELECT * INTO attendance_record FROM attendance_logs WHERE event_id = event_uuid AND user_id = user_uuid LIMIT 1;
    SELECT * INTO evaluation_response_record FROM evaluation_responses er
    JOIN evaluations e ON er.evaluation_id = e.id
    WHERE e.event_id = event_uuid AND er.user_id = user_uuid LIMIT 1;
    
    -- Build participant name
    first_name := COALESCE(user_record.first_name, '');
    last_name := COALESCE(user_record.last_name, '');
    
    IF first_name != '' AND last_name != '' THEN
        participant_name := first_name || ' ' || last_name;
    ELSIF first_name != '' THEN
        participant_name := first_name;
    ELSIF last_name != '' THEN
        participant_name := last_name;
    ELSE
        participant_name := COALESCE(user_record.email, 'Participant');
    END IF;
    
    -- Get certificate config
    SELECT * INTO cert_config_record 
    FROM certificate_configs 
    WHERE event_id = event_uuid 
    LIMIT 1;
    
    -- Build certificate data
    certificate_data := jsonb_build_object(
        'event_title', event_record.title,
        'participant_name', participant_name,
        'event_date', event_record.start_date,
        'event_venue', COALESCE(event_record.venue, ''),
        'attendance_date', COALESCE(attendance_record.check_in_time::text, ''),
        'evaluation_completed', evaluation_response_record IS NOT NULL
    );
    
    -- Add certificate config data if available
    IF cert_config_record IS NOT NULL THEN
        certificate_data := certificate_data || jsonb_build_object(
            'template_url', cert_config_record.template_url,
            'title', cert_config_record.title,
            'subtitle', COALESCE(cert_config_record.subtitle, ''),
            'signature_image_url', COALESCE(cert_config_record.signature_image_url, ''),
            'is_given_to', COALESCE(cert_config_record.is_given_to, 'participant')
        );
    END IF;
    
    RETURN certificate_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update check_certificate_eligibility function
CREATE OR REPLACE FUNCTION check_certificate_eligibility(
    event_uuid UUID,
    user_uuid UUID
)
RETURNS JSONB AS $$
DECLARE
    attendance_completed BOOLEAN := false;
    evaluation_completed BOOLEAN := false;
    has_certificate_template BOOLEAN := false;
    result JSONB;
BEGIN
    -- Check if user attended the event
    SELECT EXISTS(
        SELECT 1 FROM attendance_logs 
        WHERE event_id = event_uuid 
        AND user_id = user_uuid 
        AND check_in_time IS NOT NULL
    ) INTO attendance_completed;
    
    -- Check if user completed the evaluation
    SELECT EXISTS(
        SELECT 1 FROM evaluation_responses er
        JOIN evaluations e ON er.evaluation_id = e.id
        WHERE e.event_id = event_uuid AND er.user_id = user_uuid
    ) INTO evaluation_completed;
    
    -- Check if event has a certificate template URL
    SELECT EXISTS(
        SELECT 1 FROM certificate_configs 
        WHERE event_id = event_uuid 
        AND template_url IS NOT NULL 
        AND template_url != ''
    ) INTO has_certificate_template;
    
    -- Build result
    result := jsonb_build_object(
        'eligible', attendance_completed AND evaluation_completed AND has_certificate_template,
        'attendance_completed', attendance_completed,
        'evaluation_completed', evaluation_completed,
        'has_certificate_template', has_certificate_template
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. UPDATE RLS POLICIES
-- =====================================================

-- Drop old RLS policies on evaluations table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'evaluations'
            AND policyname LIKE '%survey%'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || policy_record.policyname || ' ON evaluations';
    END LOOP;
END $$;

-- Drop old RLS policies on evaluation_responses table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'evaluation_responses'
            AND policyname LIKE '%survey%'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || policy_record.policyname || ' ON evaluation_responses';
    END LOOP;
END $$;

-- Note: You may need to recreate RLS policies manually based on your specific requirements
-- The policies should reference 'evaluations' and 'evaluation_id' instead of 'surveys' and 'survey_id'

-- =====================================================
-- 9. UPDATE VIEWS (if any exist)
-- =====================================================

-- Check and update any views that reference surveys
DO $$
DECLARE
    view_record RECORD;
    view_definition TEXT;
    new_definition TEXT;
BEGIN
    FOR view_record IN
        SELECT viewname, definition
        FROM pg_views
        WHERE schemaname = 'public'
            AND definition LIKE '%surveys%'
    LOOP
        -- Replace surveys with evaluations in view definition
        new_definition := REPLACE(view_record.definition, 'surveys', 'evaluations');
        new_definition := REPLACE(new_definition, 'survey_id', 'evaluation_id');
        new_definition := REPLACE(new_definition, 'survey_responses', 'evaluation_responses');
        
        -- Drop and recreate view
        EXECUTE 'DROP VIEW IF EXISTS ' || view_record.viewname || ' CASCADE';
        EXECUTE 'CREATE VIEW ' || view_record.viewname || ' AS ' || new_definition;
    END LOOP;
END $$;

-- =====================================================
-- 10. UPDATE COMMENTS
-- =====================================================

COMMENT ON TABLE evaluations IS 'Event evaluations (formerly surveys)';
COMMENT ON TABLE evaluation_responses IS 'User responses to evaluations (formerly survey_responses)';
COMMENT ON COLUMN evaluation_responses.evaluation_id IS 'Reference to evaluation (formerly survey_id)';
COMMENT ON COLUMN notification_preferences.evaluation_notifications IS 'Enable evaluation notifications (formerly survey_notifications)';

-- =====================================================
-- 11. VERIFICATION QUERIES
-- =====================================================

-- Verify table renames
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluations') THEN
        RAISE EXCEPTION 'Table evaluations does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluation_responses') THEN
        RAISE EXCEPTION 'Table evaluation_responses does not exist';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'surveys') THEN
        RAISE EXCEPTION 'Old surveys table still exists';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'survey_responses') THEN
        RAISE EXCEPTION 'Old survey_responses table still exists';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;

COMMIT;

-- =====================================================
-- POST-MIGRATION NOTES
-- =====================================================
-- After running this migration:
-- 1. Update any application code that references the old table/column names
-- 2. Update any stored procedures or functions not covered here
-- 3. Test all functionality to ensure everything works
-- 4. Update documentation
-- 5. Consider creating a backup before running this migration
-- =====================================================

