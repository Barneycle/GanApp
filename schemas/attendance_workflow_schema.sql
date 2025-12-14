-- =====================================================
-- ATTENDANCE WORKFLOW SCHEMA - GanApp
-- =====================================================
-- This schema focuses on the attendance workflow:
-- User QR → Event Check-in → Attendance → Survey → Certificate
-- 
-- Features:
-- - Geolocation validation (without storing location data)
-- - Simple QR code system for attendance
-- - Integration with existing attendance_logs
-- - Survey and certificate workflow tracking
-- =====================================================

-- =====================================================
-- 1. QR CODE TYPES (Simplified)
-- =====================================================
CREATE TYPE qr_code_type AS ENUM (
    'user_profile',      -- User's personal QR code for identification
    'event_checkin'      -- Event check-in QR code for attendance
);

-- =====================================================
-- 2. ATTENDANCE STATUS (Enhanced)
-- =====================================================
CREATE TYPE attendance_status AS ENUM (
    'checked_in',        -- User has checked in via QR
    'survey_completed',  -- User has completed the survey
    'certificate_eligible', -- User is eligible for certificate
    'certificate_generated' -- Certificate has been generated
);

-- =====================================================
-- 3. SIMPLIFIED APPROACH - Use Smartphone GPS
-- =====================================================
-- No need to manually set venue coordinates!
-- Users' smartphones already have GPS built-in
-- We just validate they're at the event location

-- Add minimal columns to existing venues table
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS requires_location_validation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- =====================================================
-- 4. UPDATE EVENTS TABLE (Add Check-in Window Fields)
-- =====================================================
-- Add check-in window columns to existing events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS check_in_before_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS check_in_during_minutes INTEGER DEFAULT 30;



-- =====================================================
-- 6. ATTENDANCE WORKFLOW TABLE (New)
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_workflow (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Core relationships
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    attendance_log_id UUID REFERENCES attendance_logs(id) ON DELETE CASCADE,
    
    -- Workflow steps and status
    current_status attendance_status DEFAULT 'checked_in',
    qr_scan_id UUID REFERENCES qr_code_scans(id), -- Initial QR scan
    
    -- Survey tracking
    survey_completed_at TIMESTAMP WITH TIME ZONE,
    survey_id UUID REFERENCES surveys(id),
    survey_response_id UUID REFERENCES survey_responses(id),
    
    -- Certificate tracking
    certificate_eligible_at TIMESTAMP WITH TIME ZONE,
    certificate_id UUID REFERENCES certificates(id),
    certificate_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Workflow metadata
    workflow_data JSONB, -- Additional workflow-specific data
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one workflow per user per event
    UNIQUE(user_id, event_id)
);

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

-- Events table indexes (for new check-in window columns)
CREATE INDEX IF NOT EXISTS idx_events_check_in_before ON events(check_in_before_minutes);
CREATE INDEX IF NOT EXISTS idx_events_check_in_during ON events(check_in_during_minutes);

-- Venues table indexes (for location validation)
CREATE INDEX IF NOT EXISTS idx_venues_location_validation ON venues(requires_location_validation);


-- Attendance Workflow table indexes
CREATE INDEX IF NOT EXISTS idx_attendance_workflow_user ON attendance_workflow(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_workflow_event ON attendance_workflow(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_workflow_status ON attendance_workflow(current_status);
CREATE INDEX IF NOT EXISTS idx_attendance_workflow_attendance ON attendance_workflow(attendance_log_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attendance_workflow_user_event ON attendance_workflow(user_id, event_id);

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_workflow ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Note: Venues RLS policies already exist in your system
-- We're not overriding them, just adding geolocation functionality


-- Attendance Workflow policies
CREATE POLICY "Users can view own workflow" ON attendance_workflow
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage workflow" ON attendance_workflow
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'organizer')
        )
    );

-- =====================================================
-- 10. FUNCTIONS
-- =====================================================

-- Function to validate user location against organizer/scanner reference location
CREATE OR REPLACE FUNCTION validate_user_location_proximity(
    organizer_lat DECIMAL(10, 8),
    organizer_lng DECIMAL(11, 8),
    user_lat DECIMAL(10, 8),
    user_lng DECIMAL(11, 8),
    max_distance_meters INTEGER DEFAULT 50
)
RETURNS JSON AS $$
DECLARE
    distance_meters INTEGER;
    is_within_range BOOLEAN := false;
BEGIN
    -- Check if locations are provided
    IF organizer_lat IS NULL OR organizer_lng IS NULL THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Organizer location not set'
        );
    END IF;
    
    IF user_lat IS NULL OR user_lng IS NULL THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'User location permission required'
        );
    END IF;
    
    -- Calculate distance using Haversine formula
    distance_meters := (
        6371000 * acos(
            cos(radians(organizer_lat)) * 
            cos(radians(user_lat)) * 
            cos(radians(user_lng) - radians(organizer_lng)) + 
            sin(radians(organizer_lat)) * 
            sin(radians(user_lat))
        )
    )::INTEGER;
    
    -- Check if user is within acceptable range of organizer
    is_within_range := distance_meters <= max_distance_meters;
    
    RETURN json_build_object(
        'valid', is_within_range,
        'distance_meters', distance_meters,
        'max_distance_meters', max_distance_meters,
        'organizer_location', json_build_object('lat', organizer_lat, 'lng', organizer_lng),
        'user_location', json_build_object('lat', user_lat, 'lng', user_lng),
        'message', CASE 
            WHEN is_within_range THEN 'User is within attendance range'
            ELSE 'User is too far from the event location'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process QR code scan for attendance workflow
CREATE OR REPLACE FUNCTION process_attendance_qr_scan(
    qr_token_param TEXT,
    scanner_user_id UUID,
    organizer_lat DECIMAL(10, 8) DEFAULT NULL,  -- Organizer/scanner location (reference)
    organizer_lng DECIMAL(11, 8) DEFAULT NULL,  -- Organizer/scanner location (reference)
    user_lat DECIMAL(10, 8) DEFAULT NULL,       -- User location (to validate)
    user_lng DECIMAL(11, 8) DEFAULT NULL,       -- User location (to validate)
    max_distance_meters INTEGER DEFAULT 50,     -- Max distance in meters
    device_info_param JSONB DEFAULT NULL,
    ip_address_param INET DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    qr_record RECORD;
    event_record RECORD;
    venue_record RECORD;
    attendance_record RECORD;
    workflow_record RECORD;
    scan_record RECORD;
    location_validation JSON;
    attendance_id UUID;
    workflow_id UUID;
    scan_id UUID;
    result JSON;
BEGIN
    -- Get QR code information
    SELECT * INTO qr_record FROM qr_codes WHERE qr_token = qr_token_param AND is_active = true;
    
    IF qr_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'QR code not found or inactive'
        );
    END IF;
    
    -- Check if QR code is within event check-in window
    DECLARE
        event_start_datetime TIMESTAMP WITH TIME ZONE;
        check_in_start_time TIMESTAMP WITH TIME ZONE;
        check_in_end_time TIMESTAMP WITH TIME ZONE;
        current_time TIMESTAMP WITH TIME ZONE := NOW();
    BEGIN
        -- Calculate event start datetime
        event_start_datetime := (event_record.start_date || ' ' || event_record.start_time)::TIMESTAMP WITH TIME ZONE;
        
        -- Calculate check-in window (asymmetric: before + during)
        check_in_start_time := event_start_datetime - INTERVAL '1 minute' * qr_record.check_in_before_minutes;
        check_in_end_time := event_start_datetime + INTERVAL '1 minute' * qr_record.check_in_during_minutes;
        
        -- Check if current time is within check-in window (inclusive boundaries)
        IF current_time < check_in_start_time THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Check-in not yet available. Opens ' || check_in_start_time::TEXT,
                'check_in_window', json_build_object(
                    'opens_at', check_in_start_time,
                    'closes_at', check_in_end_time,
                    'event_starts_at', event_start_datetime
                )
            );
        END IF;
        
        IF current_time > check_in_end_time THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Check-in window has closed. Closed ' || check_in_end_time::TEXT,
                'check_in_window', json_build_object(
                    'opens_at', check_in_start_time,
                    'closes_at', check_in_end_time,
                    'event_starts_at', event_start_datetime
                )
            );
        END IF;
    END;
    
    -- Check scan limit
    IF qr_record.scan_count >= qr_record.max_scans THEN
        RETURN json_build_object(
            'success', false,
            'error', 'QR code scan limit reached'
        );
    END IF;
    
    -- Get event information
    SELECT * INTO event_record FROM events WHERE id = qr_record.event_id;
    
    -- Validate user location against organizer/scanner location
    IF qr_record.requires_location_validation THEN
        IF organizer_lat IS NULL OR organizer_lng IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Organizer must set their location first'
            );
        END IF;
        
        IF user_lat IS NULL OR user_lng IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'User location permission required for check-in. Please enable GPS.'
            );
        END IF;
        
        -- Validate user is within range of organizer/scanner
        SELECT validate_user_location_proximity(
            organizer_lat, organizer_lng, 
            user_lat, user_lng, 
            max_distance_meters
        ) INTO location_validation;
        
        IF NOT (location_validation->>'valid')::boolean THEN
            RETURN json_build_object(
                'success', false,
                'error', location_validation->>'message',
                'location_validation', location_validation
            );
        END IF;
    END IF;
    
    -- Check if user is already registered for the event
    SELECT * INTO attendance_record FROM attendance_logs 
    WHERE user_id = scanner_user_id AND event_id = qr_record.event_id;
    
    IF attendance_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User is not registered for this event'
        );
    END IF;
    
    -- Check if already checked in today (for multi-day event support)
    DECLARE
        current_date DATE := CURRENT_DATE;
        existing_check_in_today RECORD;
    BEGIN
        SELECT * INTO existing_check_in_today FROM attendance_logs
        WHERE user_id = scanner_user_id 
          AND event_id = qr_record.event_id
          AND check_in_date = current_date
          AND check_in_time IS NOT NULL;
        
        IF existing_check_in_today IS NOT NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'User has already checked in for this event today'
            );
        END IF;
    END;
    
    -- Update attendance log with check-in (set check_in_date for multi-day support)
    UPDATE attendance_logs SET
        check_in_time = NOW(),
        check_in_date = CURRENT_DATE,
        check_in_method = 'qr_scan',
        is_validated = true,
        validated_by = scanner_user_id
    WHERE id = attendance_record.id
    RETURNING id INTO attendance_id;
    
    -- Create or update workflow record
    INSERT INTO attendance_workflow (
        user_id, event_id, attendance_log_id, current_status
    ) VALUES (
        scanner_user_id, qr_record.event_id, attendance_id, 'checked_in'
    )
    ON CONFLICT (user_id, event_id) 
    DO UPDATE SET 
        attendance_log_id = attendance_id,
        current_status = 'checked_in',
        updated_at = NOW()
    RETURNING id INTO workflow_id;
    
    -- Record the QR scan
    INSERT INTO qr_code_scans (
        qr_code_id, scanned_by, attendance_log_id,
        location_validated, location_validation_method,
        organizer_location_lat, organizer_location_lng,
        user_location_lat, user_location_lng,
        distance_meters, device_info, ip_address,
        workflow_status
    ) VALUES (
        qr_record.id, scanner_user_id, attendance_id,
        (location_validation->>'valid')::boolean,
        CASE WHEN location_validation IS NOT NULL THEN 'gps' ELSE 'skipped' END,
        organizer_lat, organizer_lng,
        user_lat, user_lng,
        (location_validation->>'distance_meters')::INTEGER,
        device_info_param, ip_address_param,
        'checked_in'
    ) RETURNING id INTO scan_id;
    
    -- Update QR code scan count
    UPDATE qr_codes SET 
        scan_count = scan_count + 1,
        last_scanned_at = NOW()
    WHERE id = qr_record.id;
    
    -- Update workflow with scan ID
    UPDATE attendance_workflow SET qr_scan_id = scan_id WHERE id = workflow_id;
    
    -- Build success result
    result := json_build_object(
        'success', true,
        'message', 'Check-in successful',
        'attendance_id', attendance_id,
        'workflow_id', workflow_id,
        'scan_id', scan_id,
        'check_in_time', NOW(),
        'event_title', event_record.title,
        'next_steps', json_build_object(
            'survey_available', true,
            'certificate_eligible', false,
            'workflow_status', 'checked_in'
        ),
        'location_validation', location_validation
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update workflow status
CREATE OR REPLACE FUNCTION update_workflow_status(
    workflow_id_param UUID,
    new_status attendance_status,
    additional_data JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    workflow_record RECORD;
    result JSON;
BEGIN
    -- Get current workflow record
    SELECT * INTO workflow_record FROM attendance_workflow WHERE id = workflow_id_param;
    
    IF workflow_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Workflow not found'
        );
    END IF;
    
    -- Update workflow status
    UPDATE attendance_workflow SET
        current_status = new_status,
        survey_completed_at = CASE WHEN new_status IN ('survey_completed', 'certificate_eligible', 'certificate_generated') 
                                   AND survey_completed_at IS NULL THEN NOW() ELSE survey_completed_at END,
        certificate_eligible_at = CASE WHEN new_status IN ('certificate_eligible', 'certificate_generated') 
                                       AND certificate_eligible_at IS NULL THEN NOW() ELSE certificate_eligible_at END,
        certificate_generated_at = CASE WHEN new_status = 'certificate_generated' 
                                        AND certificate_generated_at IS NULL THEN NOW() ELSE certificate_generated_at END,
        workflow_data = COALESCE(workflow_data, '{}'::jsonb) || COALESCE(additional_data, '{}'::jsonb),
        updated_at = NOW()
    WHERE id = workflow_id_param;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Workflow status updated',
        'workflow_id', workflow_id_param,
        'new_status', new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Venues updated_at trigger already exists in your system


CREATE TRIGGER update_attendance_workflow_updated_at 
    BEFORE UPDATE ON attendance_workflow 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();




-- =====================================================
-- END OF ATTENDANCE WORKFLOW SCHEMA
-- =====================================================
