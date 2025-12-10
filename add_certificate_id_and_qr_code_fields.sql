-- =====================================================
-- ADD CERTIFICATE ID AND QR CODE FIELDS
-- Adds certificate ID configuration and QR code fields
-- =====================================================

-- Add background_image_size column (if not exists)
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS background_image_size JSONB DEFAULT NULL;

COMMENT ON COLUMN certificate_configs.background_image_size IS 'Size configuration for background image: {width: number, height: number}. If null, uses certificate dimensions.';

-- Add certificate ID configuration columns
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS cert_id_prefix VARCHAR(50) DEFAULT '';

ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS cert_id_position JSONB DEFAULT '{"x": 50, "y": 95}';

ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS cert_id_font_size INTEGER DEFAULT 14;

ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS cert_id_color VARCHAR(7) DEFAULT '#000000';

-- Add QR Code configuration columns
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS qr_code_enabled BOOLEAN DEFAULT true;

ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS qr_code_size INTEGER DEFAULT 60;

ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS qr_code_position JSONB DEFAULT '{"x": 60, "y": 95}';

-- Add signature_blocks column if it doesn't exist
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS signature_blocks JSONB DEFAULT '[]';

COMMENT ON COLUMN certificate_configs.cert_id_prefix IS 'User-defined prefix for certificate ID (format: prefix-001)';
COMMENT ON COLUMN certificate_configs.cert_id_position IS 'Position for certificate ID display: {x: percentage, y: percentage}';
COMMENT ON COLUMN certificate_configs.cert_id_font_size IS 'Font size for certificate ID in pixels';
COMMENT ON COLUMN certificate_configs.cert_id_color IS 'Color for certificate ID text';
COMMENT ON COLUMN certificate_configs.qr_code_enabled IS 'Enable/disable QR code display';
COMMENT ON COLUMN certificate_configs.qr_code_size IS 'Size of QR code in pixels';
COMMENT ON COLUMN certificate_configs.qr_code_position IS 'Position for QR code: {x: percentage, y: percentage}';
COMMENT ON COLUMN certificate_configs.signature_blocks IS 'Array of signature block configurations';

