-- =====================================================
-- ROLLBACK: Rename evaluations back to surveys
-- =====================================================
-- This script rolls back the migration from evaluations
-- back to surveys. Use only if you need to revert.
-- =====================================================

BEGIN;

-- =====================================================
-- 1. RENAME TABLES BACK
-- =====================================================

ALTER TABLE IF EXISTS evaluations RENAME TO surveys;
ALTER TABLE IF EXISTS evaluation_responses RENAME TO survey_responses;

-- =====================================================
-- 2. RENAME COLUMNS BACK
-- =====================================================

ALTER TABLE IF EXISTS survey_responses 
    RENAME COLUMN evaluation_id TO survey_id;

ALTER TABLE IF EXISTS notification_preferences 
    RENAME COLUMN evaluation_notifications TO survey_notifications;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_logs' 
        AND column_name = 'evaluation_id'
    ) THEN
        ALTER TABLE attendance_logs RENAME COLUMN evaluation_id TO survey_id;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_logs' 
        AND column_name = 'evaluation_response_id'
    ) THEN
        ALTER TABLE attendance_logs RENAME COLUMN evaluation_response_id TO survey_response_id;
    END IF;
END $$;

-- =====================================================
-- 3. UPDATE FOREIGN KEY CONSTRAINTS
-- =====================================================

DO $$
DECLARE
    fk_name TEXT;
BEGIN
    SELECT constraint_name INTO fk_name
    FROM information_schema.table_constraints
    WHERE table_name = 'survey_responses'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%evaluation%';
    
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS ' || fk_name;
    END IF;
END $$;

ALTER TABLE survey_responses
    ADD CONSTRAINT fk_survey_responses_survey_id 
    FOREIGN KEY (survey_id) 
    REFERENCES surveys(id) 
    ON DELETE CASCADE;

-- =====================================================
-- 4. UPDATE UNIQUE CONSTRAINTS
-- =====================================================

DO $$
DECLARE
    uk_name TEXT;
BEGIN
    SELECT constraint_name INTO uk_name
    FROM information_schema.table_constraints
    WHERE table_name = 'survey_responses'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%evaluation%';
    
    IF uk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS ' || uk_name;
    END IF;
END $$;

ALTER TABLE survey_responses
    ADD CONSTRAINT unique_survey_user 
    UNIQUE (survey_id, user_id);

-- =====================================================
-- 5. RENAME INDEXES BACK
-- =====================================================

ALTER INDEX IF EXISTS idx_evaluations_event_id RENAME TO idx_surveys_event_id;
ALTER INDEX IF EXISTS idx_evaluations_is_active RENAME TO idx_surveys_is_active;
ALTER INDEX IF EXISTS idx_evaluations_event_active RENAME TO idx_surveys_event_active;
ALTER INDEX IF EXISTS idx_evaluations_created_by_active RENAME TO idx_surveys_created_by_active;

ALTER INDEX IF EXISTS idx_evaluation_responses_evaluation_id RENAME TO idx_survey_responses_survey_id;
ALTER INDEX IF EXISTS idx_evaluation_responses_evaluation_user RENAME TO idx_survey_responses_survey_user;

-- =====================================================
-- 6. UPDATE TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trg_notify_evaluation_availability ON surveys;
ALTER FUNCTION notify_evaluation_availability() RENAME TO notify_survey_availability();

CREATE TRIGGER trg_notify_survey_availability
    AFTER INSERT OR UPDATE OF is_active ON surveys
    FOR EACH ROW
    EXECUTE FUNCTION notify_survey_availability();

-- =====================================================
-- 7. UPDATE FUNCTIONS BACK
-- =====================================================

CREATE OR REPLACE FUNCTION notify_survey_availability()
RETURNS TRIGGER AS $$
DECLARE
    event_title TEXT;
    survey_event_id UUID;
    user_record RECORD;
BEGIN
    IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
        SELECT e.title, e.id INTO event_title, survey_event_id
        FROM events e
        WHERE e.id = NEW.event_id;
        
        IF event_title IS NULL THEN
            RETURN NEW;
        END IF;
        
        FOR user_record IN
            SELECT er.user_id
            FROM event_registrations er
            WHERE er.event_id = survey_event_id
                AND er.status = 'registered'
                AND EXISTS (
                    SELECT 1 FROM notification_preferences np
                    WHERE np.user_id = er.user_id
                        AND np.survey_notifications = true
                )
                AND NOT EXISTS (
                    SELECT 1 FROM survey_responses sr
                    WHERE sr.survey_id = NEW.id
                        AND sr.user_id = er.user_id
                )
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n
                    WHERE n.user_id = er.user_id
                        AND n.title = 'Survey Available'
                        AND n.message LIKE '%' || event_title || '%'
                        AND n.created_at > NOW() - INTERVAL '1 hour'
                )
        LOOP
            BEGIN
                INSERT INTO notifications (
                    user_id, title, message, type, priority,
                    action_url, action_text, expires_at
                ) VALUES (
                    user_record.user_id,
                    'Survey Available',
                    'A survey is now available for "' || event_title || '". Please share your feedback!',
                    'info', 'normal',
                    '/evaluation?id=' || NEW.id,
                    'Take Survey',
                    NULL
                );
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Error creating survey notification for user %: %', 
                    user_record.user_id, SQLERRM;
            END;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update generate_certificate function
CREATE OR REPLACE FUNCTION generate_certificate(
    event_uuid UUID,
    user_uuid UUID
)
RETURNS JSONB AS $$
DECLARE
    user_record RECORD;
    attendance_record RECORD;
    survey_response_record RECORD;
    event_record RECORD;
    cert_config_record RECORD;
    participant_name TEXT := '';
    first_name TEXT;
    last_name TEXT;
    certificate_url TEXT;
    certificate_data JSONB;
BEGIN
    SELECT * INTO user_record FROM users WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    SELECT * INTO event_record FROM events WHERE id = event_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Event not found');
    END IF;
    
    SELECT * INTO attendance_record FROM attendance_logs WHERE event_id = event_uuid AND user_id = user_uuid LIMIT 1;
    SELECT * INTO survey_response_record FROM survey_responses sr
    JOIN surveys s ON sr.survey_id = s.id
    WHERE s.event_id = event_uuid AND sr.user_id = user_uuid LIMIT 1;
    
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
    
    SELECT * INTO cert_config_record 
    FROM certificate_configs 
    WHERE event_id = event_uuid 
    LIMIT 1;
    
    certificate_data := jsonb_build_object(
        'event_title', event_record.title,
        'participant_name', participant_name,
        'event_date', event_record.start_date,
        'event_venue', COALESCE(event_record.venue, ''),
        'attendance_date', COALESCE(attendance_record.check_in_time::text, ''),
        'evaluation_completed', survey_response_record IS NOT NULL
    );
    
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
    survey_completed BOOLEAN := false;
    has_certificate_template BOOLEAN := false;
    result JSONB;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM attendance_logs 
        WHERE event_id = event_uuid 
        AND user_id = user_uuid 
        AND check_in_time IS NOT NULL
    ) INTO attendance_completed;
    
    SELECT EXISTS(
        SELECT 1 FROM survey_responses sr
        JOIN surveys s ON sr.survey_id = s.id
        WHERE s.event_id = event_uuid AND sr.user_id = user_uuid
    ) INTO survey_completed;
    
    SELECT EXISTS(
        SELECT 1 FROM certificate_configs 
        WHERE event_id = event_uuid 
        AND template_url IS NOT NULL 
        AND template_url != ''
    ) INTO has_certificate_template;
    
    result := jsonb_build_object(
        'eligible', attendance_completed AND survey_completed AND has_certificate_template,
        'attendance_completed', attendance_completed,
        'evaluation_completed', survey_completed,
        'has_certificate_template', has_certificate_template
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

