-- =====================================================
-- ESSENTIAL INDEXES FOR QR CODE WORKFLOW
-- =====================================================

-- CRITICAL: QR Code Scans Performance
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code_id ON qr_code_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_timestamp ON qr_code_scans(scan_timestamp);
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_timestamp ON qr_code_scans(qr_code_id, scan_timestamp);

-- IMPORTANT: Event Management
CREATE INDEX IF NOT EXISTS idx_qr_codes_event_type ON qr_codes(event_id, code_type);
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_by ON qr_codes(created_by);

-- HELPFUL: User Activity
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_by ON qr_code_scans(scanned_by);

-- ATTENDANCE WORKFLOW: Essential for check-in process
CREATE INDEX IF NOT EXISTS idx_attendance_workflow_user_event ON attendance_workflow(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_workflow_status ON attendance_workflow(current_status);

-- ATTENDANCE LOGS: For validation and history
CREATE INDEX IF NOT EXISTS idx_attendance_logs_event_user ON attendance_logs(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_check_in_time ON attendance_logs(check_in_time);
