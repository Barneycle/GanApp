-- =====================================================
-- ADD ENHANCED CERTIFICATE FIELDS
-- Adds header, logos, signatures, and participation text
-- =====================================================

-- Add header fields
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS header_config JSONB DEFAULT '{
  "republic_text": "Republic of the Philippines",
  "university_text": "Partido State University",
  "location_text": "Goa, Camarines Sur",
  "republic_config": {
    "font_size": 14,
    "color": "#000000",
    "position": {"x": 50, "y": 5},
    "font_family": "Arial, sans-serif",
    "font_weight": "normal"
  },
  "university_config": {
    "font_size": 20,
    "color": "#000000",
    "position": {"x": 50, "y": 8},
    "font_family": "Arial, sans-serif",
    "font_weight": "bold"
  },
  "location_config": {
    "font_size": 14,
    "color": "#000000",
    "position": {"x": 50, "y": 11},
    "font_family": "Arial, sans-serif",
    "font_weight": "normal"
  }
}';

-- Add logo configurations
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS logo_config JSONB DEFAULT '{
  "psu_logo_url": null,
  "psu_logo_size": {"width": 100, "height": 100},
  "psu_logo_position": {"x": 10, "y": 5},
  "sponsor_logos": [],
  "sponsor_logo_size": {"width": 80, "height": 80},
  "sponsor_logo_position": {"x": 90, "y": 5},
  "sponsor_logo_spacing": 10
}';

-- Add participation text configuration
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS participation_text_config JSONB DEFAULT '{
  "text_template": "For his/her active participation during the {EVENT_NAME} held on {EVENT_DATE} at {VENUE}",
  "font_size": 18,
  "color": "#000000",
  "position": {"x": 50, "y": 40},
  "font_family": "Arial, sans-serif",
  "font_weight": "normal",
  "line_height": 1.5
}';

-- Add "Given this on" text configuration
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS given_text_config JSONB DEFAULT '{
  "text_template": "Given this on {DATE} at {VENUE}",
  "font_size": 14,
  "color": "#000000",
  "position": {"x": 50, "y": 85},
  "font_family": "Arial, sans-serif",
  "font_weight": "normal"
}';

-- Add signature blocks (array of signature configurations)
ALTER TABLE certificate_configs
ADD COLUMN IF NOT EXISTS signature_blocks JSONB DEFAULT '[]';

-- Example signature block structure stored in JSONB:
-- [
--   {
--     "signature_image_url": null,
--     "name": "",
--     "position": "",
--     "position_config": {"x": 25, "y": 92},
--     "name_font_size": 14,
--     "name_color": "#000000",
--     "position_font_size": 12,
--     "position_color": "#666666",
--     "font_family": "Arial, sans-serif"
--   }
-- ]

