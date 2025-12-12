-- =====================================================
-- ADD title_font_family COLUMN
-- Adds the title font family column to certificate_configs
-- =====================================================

-- Add title_font_family column
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS title_font_family VARCHAR(255) DEFAULT 'Libre Baskerville, serif';

COMMENT ON COLUMN certificate_configs.title_font_family IS 'Font family for the certificate title and subtitle';

