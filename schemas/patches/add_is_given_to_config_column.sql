-- =====================================================
-- ADD is_given_to_config COLUMN
-- Adds the "is given to" text configuration column
-- =====================================================

-- Add "is given to" text configuration
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS is_given_to_config JSONB DEFAULT '{
  "text": "This certificate is proudly presented to",
  "font_size": 16,
  "color": "#000000",
  "position": {"x": 50, "y": 38},
  "font_family": "Libre Baskerville, serif",
  "font_weight": "normal"
}';

