# Certificate Enhancement Plan

## New Features Required

### 1. Header Section
- "Republic of the Philippines" (top)
- "Partido State University" 
- "Goa, Camarines Sur"

### 2. Logos
- PSU Logo (top left corner)
- Sponsor/Company/Org Logos (top right corner - multiple allowed)

### 3. Participation Text
- "For his/her active participation during the (EVENT NAME) held on (date) at (Venue)"

### 4. Bottom Text
- "Given this on (date) at (venue)"

### 5. Signature Blocks
- Multiple signature blocks
- Each block contains:
  - Signature image
  - Name
  - Position
- Can add/remove multiple signature blocks

## Implementation Steps

1. ✅ Update database schema (add_certificate_enhanced_fields.sql)
2. ✅ Update CertificateConfig interface
3. ⏳ Update default config in CertificateDesigner
4. ⏳ Update preview rendering
5. ⏳ Add UI controls for new fields
6. ⏳ Update certificate generation service

## Database Changes
- header_config (JSONB)
- logo_config (JSONB)
- participation_text_config (JSONB)
- given_text_config (JSONB)
- signature_blocks (JSONB array)

