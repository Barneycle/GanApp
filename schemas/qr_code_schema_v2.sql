-- =====================================================
-- QR CODE SCHEMA V2 - Enhanced GanApp QR Code System
-- =====================================================
-- This schema provides a comprehensive QR code system supporting:
-- - Multiple QR code types (user, event, check-in, admin, etc.)
-- - QR code validation and expiration
-- - Enhanced scan tracking with metadata
-- - QR code analytics and usage statistics
-- - Better security and access control
-- =====================================================

-- =====================================================
-- 1. QR CODE TYPES ENUM (Simplified for Attendance Workflow)
-- =====================================================
CREATE TYPE qr_code_type AS ENUM (
    'user_profile',      -- User's personal QR code for identification
    'event_checkin'      -- Event check-in QR code for attendance
);

-- =====================================================
-- 2. QR CODES TABLE (Simplified for Attendance)
-- =====================================================
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Core QR code information
    code_type qr_code_type NOT NULL DEFAULT 'user_profile',
    is_active BOOLEAN NOT NULL DEFAULT true,
    title VARCHAR(255), -- Human-readable title for the QR code
    description TEXT,   -- Optional description
    
    -- Ownership and relationships
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Can be different from created_by (e.g., admin creates for user)
    
    -- Event relationship (for event-related QR codes)
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    
    -- QR code data and metadata
    qr_data JSONB NOT NULL, -- The actual QR code data payload
    qr_token TEXT UNIQUE,   -- Unique token for QR code validation
    
    -- Validation and security
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    max_scans INTEGER, -- Optional scan limit
    scan_count INTEGER DEFAULT 0, -- Current scan count
    
    -- Access control (simplified)
    is_public BOOLEAN DEFAULT false, -- Whether QR code can be scanned by anyone
    
    -- Metadata
    metadata JSONB, -- Additional metadata (location, custom fields, etc.)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_scanned_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 4. QR CODE SCANS TABLE (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS qr_code_scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relationships
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who scanned (can be NULL for anonymous scans)
    
    -- Scan details
    scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scan_method VARCHAR(50) DEFAULT 'qr_scan' CHECK (scan_method IN ('qr_scan', 'manual', 'api', 'admin_override')),
    
    -- Location and device information
    location_data JSONB, -- GPS coordinates, venue info, etc.
    device_info JSONB,   -- Device type, OS, browser, etc.
    ip_address INET,     -- IP address of scanner
    
    -- Scan context
    scan_context VARCHAR(100), -- Context where scan occurred (checkin, registration, etc.)
    scan_result JSONB,   -- Result of the scan (success, error, additional data)
    
    -- Validation
    is_valid BOOLEAN DEFAULT true,
    validation_notes TEXT,
    
    -- Metadata
    metadata JSONB -- Additional scan metadata
);

-- =====================================================
-- 5. QR CODE ANALYTICS TABLE (New)
-- =====================================================
CREATE TABLE IF NOT EXISTS qr_code_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relationships
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    
    -- Analytics period
    analytics_date DATE NOT NULL,
    analytics_hour INTEGER CHECK (analytics_hour >= 0 AND analytics_hour <= 23), -- For hourly analytics
    
    -- Metrics
    total_scans INTEGER DEFAULT 0,
    unique_scans INTEGER DEFAULT 0,
    successful_scans INTEGER DEFAULT 0,
    failed_scans INTEGER DEFAULT 0,
    
    -- Geographic data
    countries JSONB, -- Country breakdown
    cities JSONB,    -- City breakdown
    
    -- Device data
    device_types JSONB, -- Device type breakdown
    browsers JSONB,     -- Browser breakdown
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for daily/hourly analytics
    UNIQUE(qr_code_id, analytics_date, analytics_hour)
);

-- =====================================================
-- 5. QR CODE TEMPLATES TABLE (Simplified)
-- =====================================================
CREATE TABLE IF NOT EXISTS qr_code_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Template information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type qr_code_type NOT NULL,
    
    -- Template configuration
    default_settings JSONB NOT NULL, -- Default QR code settings
    validation_rules JSONB,          -- Validation rules for this template type
    
    -- Access control
    is_system_template BOOLEAN DEFAULT false, -- System vs user-created templates
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

-- QR Codes table indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_by ON qr_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_qr_codes_owner_id ON qr_codes(owner_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_event_id ON qr_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_type ON qr_codes(code_type);
CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON qr_codes(qr_token);
CREATE INDEX IF NOT EXISTS idx_qr_codes_expires_at ON qr_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_codes_last_scanned ON qr_codes(last_scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_codes_public ON qr_codes(is_public);

-- Essential indexes for common queries
CREATE INDEX IF NOT EXISTS idx_qr_codes_event_type ON qr_codes(event_id, code_type);

-- QR Code Scans table indexes
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code_id ON qr_code_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_by ON qr_code_scans(scanned_by);
CREATE INDEX IF NOT EXISTS idx_qr_scans_timestamp ON qr_code_scans(scan_timestamp);

-- Composite indexes for scans
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_timestamp ON qr_code_scans(qr_code_id, scan_timestamp);
CREATE INDEX IF NOT EXISTS idx_qr_scans_by_timestamp ON qr_code_scans(scanned_by, scan_timestamp);


-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. RLS POLICIES FOR QR CODES TABLE
-- =====================================================

-- Users can view their own QR codes
CREATE POLICY "Users can view own QR codes" ON qr_codes
    FOR SELECT USING (
        auth.uid() = owner_id OR 
        auth.uid() = created_by OR
        is_public = true
    );

-- Users can create QR codes for themselves
CREATE POLICY "Users can create own QR codes" ON qr_codes
    FOR INSERT WITH CHECK (
        auth.uid() = created_by AND 
        (owner_id IS NULL OR auth.uid() = owner_id)
    );

-- Users can update their own QR codes
CREATE POLICY "Users can update own QR codes" ON qr_codes
    FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = created_by);

-- Users can delete their own QR codes
CREATE POLICY "Users can delete own QR codes" ON qr_codes
    FOR DELETE USING (auth.uid() = owner_id OR auth.uid() = created_by);

-- Admins can view all QR codes
CREATE POLICY "Admins can view all QR codes" ON qr_codes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- =====================================================
-- 10. RLS POLICIES FOR QR CODE SCANS TABLE
-- =====================================================

-- Users can view scans of their own QR codes
CREATE POLICY "Users can view scans of own QR codes" ON qr_code_scans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM qr_codes 
            WHERE id = qr_code_id AND 
            (owner_id = auth.uid() OR created_by = auth.uid())
        ) OR
        scanned_by = auth.uid()
    );

-- Anyone can insert scan records (for scanning functionality)
CREATE POLICY "Anyone can insert scan records" ON qr_code_scans
    FOR INSERT WITH CHECK (true);

-- QR code owners can update scan records
CREATE POLICY "QR owners can update scan records" ON qr_code_scans
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM qr_codes 
            WHERE id = qr_code_id AND 
            (owner_id = auth.uid() OR created_by = auth.uid())
        )
    );

-- QR code owners can delete scan records
CREATE POLICY "QR owners can delete scan records" ON qr_code_scans
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM qr_codes 
            WHERE id = qr_code_id AND 
            (owner_id = auth.uid() OR created_by = auth.uid())
        )
    );


-- =====================================================
-- 13. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique QR token
CREATE OR REPLACE FUNCTION generate_qr_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Function to validate QR code
CREATE OR REPLACE FUNCTION validate_qr_code(
    qr_token_param TEXT,
    scanner_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    qr_record RECORD;
    result JSON;
BEGIN
    -- Get QR code record
    SELECT * INTO qr_record FROM qr_codes WHERE qr_token = qr_token_param;
    
    IF qr_record IS NULL THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'QR code not found'
        );
    END IF;
    
    -- Check if QR code is active
    IF NOT qr_record.is_active THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'QR code is not active'
        );
    END IF;
    
    -- Check expiration
    IF qr_record.expires_at IS NOT NULL AND qr_record.expires_at < NOW() THEN
        -- Auto-expire the QR code
        UPDATE qr_codes SET is_active = false WHERE id = qr_record.id;
        RETURN json_build_object(
            'valid', false,
            'error', 'QR code has expired'
        );
    END IF;
    
    -- Check scan limit
    IF qr_record.max_scans IS NOT NULL AND qr_record.scan_count >= qr_record.max_scans THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'QR code scan limit reached'
        );
    END IF;
    
    -- Note: Removed allowed_scanners check for simplicity
    
    -- Check if QR code is public or scanner has access
    IF NOT qr_record.is_public AND scanner_id IS NOT NULL THEN
        IF NOT (scanner_id = qr_record.owner_id OR scanner_id = qr_record.created_by) THEN
            RETURN json_build_object(
                'valid', false,
                'error', 'Access denied to this QR code'
            );
        END IF;
    END IF;
    
    -- Return valid result
    RETURN json_build_object(
        'valid', true,
        'qr_code', row_to_json(qr_record),
        'message', 'QR code is valid'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record QR code scan
CREATE OR REPLACE FUNCTION record_qr_scan(
    qr_token_param TEXT,
    scanner_id UUID DEFAULT NULL,
    scan_method_param VARCHAR(50) DEFAULT 'qr_scan',
    scan_context_param VARCHAR(100) DEFAULT NULL,
    location_data_param JSONB DEFAULT NULL,
    device_info_param JSONB DEFAULT NULL,
    ip_address_param INET DEFAULT NULL,
    scan_result_param JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    qr_record RECORD;
    scan_record RECORD;
    validation_result JSON;
BEGIN
    -- Validate QR code first
    SELECT validate_qr_code(qr_token_param, scanner_id) INTO validation_result;
    
    IF (validation_result->>'valid')::boolean = false THEN
        RETURN validation_result;
    END IF;
    
    -- Get QR code record
    SELECT * INTO qr_record FROM qr_codes WHERE qr_token = qr_token_param;
    
    -- Insert scan record
    INSERT INTO qr_code_scans (
        qr_code_id,
        scanned_by,
        scan_method,
        scan_context,
        location_data,
        device_info,
        ip_address,
        scan_result
    ) VALUES (
        qr_record.id,
        scanner_id,
        scan_method_param,
        scan_context_param,
        location_data_param,
        device_info_param,
        ip_address_param,
        scan_result_param
    ) RETURNING * INTO scan_record;
    
    -- Update QR code scan count and last scanned timestamp
    UPDATE qr_codes SET 
        scan_count = scan_count + 1,
        last_scanned_at = NOW()
    WHERE id = qr_record.id;
    
    -- Return success result
    RETURN json_build_object(
        'success', true,
        'scan_id', scan_record.id,
        'scan_timestamp', scan_record.scan_timestamp,
        'qr_code', row_to_json(qr_record),
        'message', 'Scan recorded successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 14. TRIGGERS
-- =====================================================

-- Trigger to update updated_at on qr_codes
CREATE TRIGGER update_qr_codes_updated_at 
    BEFORE UPDATE ON qr_codes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on qr_code_templates
CREATE TRIGGER update_qr_templates_updated_at 
    BEFORE UPDATE ON qr_code_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to generate QR token on insert
CREATE OR REPLACE FUNCTION set_qr_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.qr_token IS NULL OR NEW.qr_token = '' THEN
        NEW.qr_token = generate_qr_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_qr_token_trigger
    BEFORE INSERT ON qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION set_qr_token();



-- =====================================================
-- END OF QR CODE SCHEMA V2
-- =====================================================
