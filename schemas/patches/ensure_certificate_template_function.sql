-- Function to ensure certificate template record exists
-- This function bypasses RLS (SECURITY DEFINER) so any authenticated user can create
-- a template record when the event has a certificate-templates_url
CREATE OR REPLACE FUNCTION ensure_certificate_template(
    p_event_id UUID,
    p_template_url TEXT,
    p_created_by UUID
)
RETURNS JSON AS $$
DECLARE
    v_template_id UUID;
    v_template_record RECORD;
    v_event_title TEXT;
BEGIN
    -- Get event title for template name
    SELECT title INTO v_event_title FROM events WHERE id = p_event_id;
    
    -- Check if template already exists
    SELECT id INTO v_template_id
    FROM "certificate-templates"
    WHERE event_id = p_event_id AND is_active = true
    LIMIT 1;
    
    IF v_template_id IS NOT NULL THEN
        -- Template exists, return it
        SELECT * INTO v_template_record
        FROM "certificate-templates"
        WHERE id = v_template_id;
        
        RETURN json_build_object(
            'success', true,
            'template_id', v_template_record.id,
            'message', 'Template already exists'
        );
    END IF;
    
    -- Template doesn't exist, create it
    INSERT INTO "certificate-templates" (
        event_id,
        title,
        description,
        template_url,
        template_type,
        content_fields,
        requires_attendance,
        requires_survey_completion,
        minimum_survey_score,
        is_active,
        created_by
    ) VALUES (
        p_event_id,
        COALESCE(v_event_title, 'Certificate Template for Event'),
        'Certificate template for event: ' || COALESCE(v_event_title, 'Unknown Event'),
        p_template_url,
        CASE 
            WHEN p_template_url ~* '\.pdf$' THEN 'pdf'
            WHEN p_template_url ~* '\.(jpg|jpeg|png|gif)$' THEN 'image'
            ELSE 'document'
        END,
        jsonb_build_object(
            'participant_name', '{{name}}',
            'event_title', '{{event}}',
            'date', '{{date}}',
            'organizer', '{{organizer}}'
        ),
        true,
        true,
        0,
        true,
        p_created_by
    )
    RETURNING id INTO v_template_id;
    
    RETURN json_build_object(
        'success', true,
        'template_id', v_template_id,
        'message', 'Template record created successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to create template record: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

