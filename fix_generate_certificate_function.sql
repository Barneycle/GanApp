-- First, make certificate_template_id nullable since we're using events.certificate_templates_url
ALTER TABLE certificates ALTER COLUMN certificate_template_id DROP NOT NULL;
-- Remove foreign key constraint if certificate_templates table doesn't exist
-- ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_certificate_template_id_fkey;

-- Fixed generate_certificate function
-- Uses auth.users instead of users table, and gets template URL from events table
CREATE OR REPLACE FUNCTION generate_certificate(
    user_uuid UUID,
    event_uuid UUID,
    generated_by_uuid UUID,
    preferred_format_text VARCHAR(10) DEFAULT 'pdf'
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    eligibility_check JSON;
    user_record RECORD;
    event_record RECORD;
    certificate_number TEXT;
    certificate_id UUID;
    attendance_record RECORD;
    survey_response_record RECORD;
    pdf_url TEXT;
    png_url TEXT;
    participant_name TEXT;
    first_name TEXT;
    last_name TEXT;
BEGIN
    -- Check eligibility
    SELECT * FROM check_certificate_eligibility(user_uuid, event_uuid) INTO eligibility_check;
    
    IF NOT (eligibility_check->>'eligible')::BOOLEAN THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not eligible for certificate',
            'details', eligibility_check
        );
    END IF;
    
    -- Get user details from auth.users (Supabase Auth)
    SELECT 
        id,
        email,
        raw_user_meta_data->>'first_name' as first_name,
        raw_user_meta_data->>'last_name' as last_name
    INTO user_record
    FROM auth.users 
    WHERE id = user_uuid;
    
    IF user_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Get event details
    SELECT * INTO event_record FROM events WHERE id = event_uuid;
    
    IF event_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Event not found'
        );
    END IF;
    
    -- Get attendance and survey data
    SELECT * INTO attendance_record FROM attendance_logs WHERE event_id = event_uuid AND user_id = user_uuid LIMIT 1;
    SELECT * INTO survey_response_record FROM survey_responses sr
    JOIN surveys s ON sr.survey_id = s.id
    WHERE s.event_id = event_uuid AND sr.user_id = user_uuid LIMIT 1;
    
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
    
    -- Generate certificate number (use last_name if available, otherwise use email)
    IF last_name != '' THEN
        certificate_number := generate_certificate_number(event_record.title, last_name);
    ELSE
        certificate_number := generate_certificate_number(event_record.title, split_part(user_record.email, '@', 1));
    END IF;
    
    -- Generate certificate files (this would typically call an external service)
    -- For now, we'll create placeholder URLs for both formats
    -- In production, this would call a certificate generation service for both formats
    
    pdf_url := 'https://generated-certificates.example.com/' || certificate_number || '.pdf';
    png_url := 'https://generated-certificates.example.com/' || certificate_number || '.png';
    
    -- Insert certificate record
    -- Note: certificate_template_id is set to NULL since we're using events.certificate_templates_url directly
    INSERT INTO certificates (
        certificate_template_id,
        event_id,
        user_id,
        certificate_number,
        participant_name,
        event_title,
        completion_date,
        certificate_pdf_url,
        certificate_png_url,
        preferred_format,
        generated_by
    ) VALUES (
        NULL, -- No template_id since we use events.certificate_templates_url
        event_uuid,
        user_uuid,
        certificate_number,
        participant_name,
        event_record.title,
        COALESCE(attendance_record.check_in_time::DATE, event_record.start_date),
        pdf_url,
        png_url,
        preferred_format_text,
        generated_by_uuid
    ) RETURNING id INTO certificate_id;
    
    -- Build result
    result = json_build_object(
        'success', true,
        'certificate_id', certificate_id,
        'certificate_number', certificate_number,
        'certificate_pdf_url', pdf_url,
        'certificate_png_url', png_url,
        'preferred_format', preferred_format_text,
        'participant_name', participant_name,
        'event_title', event_record.title,
        'completion_date', COALESCE(attendance_record.check_in_time::DATE, event_record.start_date),
        'generated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

