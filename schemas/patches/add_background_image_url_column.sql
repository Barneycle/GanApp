-- =====================================================
-- ADD BACKGROUND IMAGE URL COLUMN
-- Adds background_image_url field for PNG background images
-- =====================================================

-- Add background_image_url column to store PNG background image URL
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS background_image_url TEXT DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN certificate_configs.background_image_url IS 'URL to PNG background image for the certificate. Stored in certificate-templates bucket. Falls back to background_color if not provided.';



