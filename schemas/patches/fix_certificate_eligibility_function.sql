-- Simplified check_certificate_eligibility function
-- Uses events.certificate_templates_url directly instead of separate certificate_templates table
CREATE OR REPLACE FUNCTION check_certificate_eligibility(
    user_uuid UUID,
    event_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    attendance_exists BOOLEAN;
    survey_completed BOOLEAN;
    template_available BOOLEAN;
    template_url TEXT;
BEGIN
    -- Check if user attended the event
    SELECT EXISTS(
        SELECT 1 FROM attendance_logs 
        WHERE event_id = event_uuid AND user_id = user_uuid AND is_validated = true
    ) INTO attendance_exists;
    
    -- Check if user completed the survey
    SELECT EXISTS(
        SELECT 1 FROM survey_responses sr
        JOIN surveys s ON sr.survey_id = s.id
        WHERE s.event_id = event_uuid AND sr.user_id = user_uuid
    ) INTO survey_completed;
    
    -- Check if event has a certificate template URL
    SELECT 
        certificate_templates_url IS NOT NULL AND certificate_templates_url != '',
        certificate_templates_url
    INTO template_available, template_url
    FROM events
    WHERE id = event_uuid;
    
    -- If template_url wasn't found, set defaults
    IF template_url IS NULL THEN
        template_available := false;
    END IF;
    
    -- Build result
    result = json_build_object(
        'eligible', attendance_exists AND survey_completed AND template_available,
        'attendance_verified', attendance_exists,
        'survey_completed', survey_completed,
        'template_available', template_available,
        'template', CASE 
            WHEN template_available AND template_url IS NOT NULL THEN json_build_object(
                'template_url', template_url,
                'requires_attendance', true,
                'requires_survey_completion', true,
                'minimum_survey_score', 0
            )
            ELSE NULL
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

