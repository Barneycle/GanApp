-- =====================================================
-- ADD title_subtitle COLUMN
-- Adds the title subtitle column for certificate titles
-- =====================================================

-- Add title subtitle column
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS title_subtitle VARCHAR(255) DEFAULT 'OF PARTICIPATION';

