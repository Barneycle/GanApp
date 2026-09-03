-- =====================================================
-- DROP INDEXES SCRIPT
-- =====================================================

-- Drop QR Codes indexes
DROP INDEX IF EXISTS idx_qr_codes_owner_type;
DROP INDEX IF EXISTS idx_qr_codes_event_type;
DROP INDEX IF EXISTS idx_qr_codes_type_active;
DROP INDEX IF EXISTS idx_qr_codes_created_type;

-- Drop QR Code Scans indexes
DROP INDEX IF EXISTS idx_qr_scans_qr_code_id;
DROP INDEX IF EXISTS idx_qr_scans_scanned_by;
DROP INDEX IF EXISTS idx_qr_scans_timestamp;
DROP INDEX IF EXISTS idx_qr_scans_method;
DROP INDEX IF EXISTS idx_qr_scans_context;
DROP INDEX IF EXISTS idx_qr_scans_valid;
DROP INDEX IF EXISTS idx_qr_scans_qr_timestamp;
DROP INDEX IF EXISTS idx_qr_scans_by_timestamp;

-- Drop QR Code Analytics indexes
DROP INDEX IF EXISTS idx_qr_analytics_qr_code_id;
DROP INDEX IF EXISTS idx_qr_analytics_date;
DROP INDEX IF EXISTS idx_qr_analytics_qr_date;
