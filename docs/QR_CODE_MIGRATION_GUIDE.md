# QR Code Schema Migration Guide
## Upgrading from V1 to V2

This guide will help you migrate from the existing QR code schema (v1) to the new enhanced schema (v2).

## Overview of Changes

### New Features in V2:
- **Multiple QR Code Types**: Support for user_profile, event_registration, event_checkin, admin_access, etc.
- **Enhanced Validation**: QR code expiration, scan limits, access control
- **Analytics System**: Comprehensive tracking and analytics
- **Template System**: Reusable QR code templates
- **Better Security**: Enhanced RLS policies and validation functions
- **Improved Metadata**: Better support for location, device, and custom data

### Breaking Changes:
- Table names have changed (`qr_codes` remains, `qr_scans` → `qr_code_scans`)
- New required columns and constraints
- Updated RLS policies
- New enum types

## Migration Steps

### Step 1: Backup Your Data
```sql
-- Create backup tables
CREATE TABLE qr_codes_backup AS SELECT * FROM qr_codes;
CREATE TABLE qr_scans_backup AS SELECT * FROM qr_scans;
```

### Step 2: Create New Enum Types
```sql
-- These are included in the v2 schema, but run separately if needed
CREATE TYPE qr_code_type AS ENUM (
    'user_profile', 'event_registration', 'event_checkin', 
    'admin_access', 'venue_access', 'certificate', 
    'survey_access', 'networking', 'custom'
);

CREATE TYPE qr_code_status AS ENUM (
    'active', 'inactive', 'expired', 'revoked', 'suspended'
);
```

### Step 3: Migrate QR Codes Table
```sql
-- Add new columns to existing qr_codes table
ALTER TABLE qr_codes 
ADD COLUMN IF NOT EXISTS code_type qr_code_type DEFAULT 'user_profile',
ADD COLUMN IF NOT EXISTS status qr_code_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS max_scans INTEGER,
ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_scanners UUID[],
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP WITH TIME ZONE;

-- Generate QR tokens for existing records
UPDATE qr_codes SET qr_token = encode(gen_random_bytes(32), 'base64url') WHERE qr_token IS NULL;

-- Set owner_id to user_id for existing records
UPDATE qr_codes SET owner_id = user_id WHERE owner_id IS NULL;

-- Determine QR code types based on existing data
UPDATE qr_codes SET 
    code_type = CASE 
        WHEN qr_data->>'type' = 'user_qr' THEN 'user_profile'
        WHEN qr_data->>'type' = 'event_registration' THEN 'event_registration'
        ELSE 'user_profile'
    END;
```

### Step 4: Rename and Migrate Scans Table
```sql
-- Rename existing table
ALTER TABLE qr_scans RENAME TO qr_code_scans_old;

-- Create new scans table (from v2 schema)
-- [Include the CREATE TABLE statement from qr_code_scans in v2 schema]

-- Migrate data from old to new table
INSERT INTO qr_code_scans (
    qr_code_id, scanned_by, scan_timestamp, scan_method, 
    device_info, scan_result
)
SELECT 
    qr_code_id,
    user_id as scanned_by,
    scanned_at as scan_timestamp,
    'qr_scan' as scan_method,
    jsonb_build_object(
        'scanner_info', scanner_info,
        'location_info', location_info,
        'device_info', device_info
    ) as device_info,
    jsonb_build_object('legacy_scan', true) as scan_result
FROM qr_code_scans_old;

-- Drop old table after verification
-- DROP TABLE qr_code_scans_old;
```

### Step 5: Create New Tables
```sql
-- Run the CREATE TABLE statements for:
-- - qr_code_analytics
-- - qr_code_templates
-- [Include these from the v2 schema]
```

### Step 6: Update Indexes
```sql
-- Drop old indexes
DROP INDEX IF EXISTS idx_qr_scans_user_id;
DROP INDEX IF EXISTS idx_qr_scans_qr_code_id;
DROP INDEX IF EXISTS idx_qr_scans_scanned_at;

-- Create new indexes (from v2 schema)
-- [Include all the CREATE INDEX statements from v2 schema]
```

### Step 7: Update RLS Policies
```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can insert their own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can update their own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can delete their own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can view scans of their QR codes" ON qr_scans;
DROP POLICY IF EXISTS "Anyone can insert scan records" ON qr_scans;
DROP POLICY IF EXISTS "QR code owners can update scan records" ON qr_scans;
DROP POLICY IF EXISTS "QR code owners can delete scan records" ON qr_scans;

-- Create new policies (from v2 schema)
-- [Include all the CREATE POLICY statements from v2 schema]
```

### Step 8: Create New Functions
```sql
-- Create the new functions from v2 schema:
-- - generate_qr_token()
-- - validate_qr_code()
-- - record_qr_scan()
-- [Include these function definitions]
```

### Step 9: Create Triggers
```sql
-- Create new triggers (from v2 schema)
-- [Include trigger definitions]
```

### Step 10: Insert Initial Data
```sql
-- Insert system templates
-- [Include the INSERT statements for qr_code_templates]
```

### Step 11: Create Views
```sql
-- Create the new views
-- [Include view definitions]
```

## Application Code Updates

### Frontend Changes
1. **Update QR Code Generation**:
   ```javascript
   // Old way
   const qrData = { userId: user.id, type: 'user_qr' };
   
   // New way
   const qrData = {
     userId: user.id,
     type: 'user_profile',
     title: 'User Profile QR',
     metadata: { /* additional data */ }
   };
   ```

2. **Update QR Code Scanning**:
   ```javascript
   // Use new validation function
   const result = await supabase.rpc('validate_qr_code', {
     qr_token_param: qrToken,
     scanner_id: user.id
   });
   
   if (result.data.valid) {
     // Record the scan
     const scanResult = await supabase.rpc('record_qr_scan', {
       qr_token_param: qrToken,
       scanner_id: user.id,
       scan_method_param: 'qr_scan',
       location_data_param: locationData,
       device_info_param: deviceInfo
     });
   }
   ```

### Backend Changes
1. **Update Service Functions**:
   - Use new validation and recording functions
   - Handle new QR code types
   - Implement analytics tracking

2. **Update API Endpoints**:
   - Support new QR code creation parameters
   - Return enhanced scan data
   - Provide analytics endpoints

## Verification Steps

### 1. Test QR Code Creation
```sql
-- Test creating a new QR code
INSERT INTO qr_codes (
    code_type, title, created_by, owner_id, qr_data
) VALUES (
    'user_profile', 'Test QR', 'user-uuid', 'user-uuid', '{"test": true}'
);

-- Verify token was generated
SELECT qr_token FROM qr_codes WHERE title = 'Test QR';
```

### 2. Test QR Code Validation
```sql
-- Test validation function
SELECT validate_qr_code('your-qr-token-here', 'scanner-user-uuid');
```

### 3. Test Scan Recording
```sql
-- Test scan recording
SELECT record_qr_scan(
    'your-qr-token-here',
    'scanner-user-uuid',
    'qr_scan',
    'test_context',
    '{"lat": 40.7128, "lng": -74.0060}'::jsonb,
    '{"device": "mobile", "os": "iOS"}'::jsonb
);
```

### 4. Test Analytics
```sql
-- Check if analytics are being recorded
SELECT * FROM qr_code_analytics WHERE qr_code_id = 'your-qr-code-uuid';
```

## Rollback Plan

If you need to rollback:

1. **Restore from backup**:
   ```sql
   DROP TABLE qr_codes;
   ALTER TABLE qr_codes_backup RENAME TO qr_codes;
   
   DROP TABLE qr_code_scans;
   ALTER TABLE qr_scans_backup RENAME TO qr_scans;
   ```

2. **Drop new tables**:
   ```sql
   DROP TABLE IF EXISTS qr_code_analytics;
   DROP TABLE IF EXISTS qr_code_templates;
   ```

3. **Drop new types**:
   ```sql
   DROP TYPE IF EXISTS qr_code_status;
   DROP TYPE IF EXISTS qr_code_type;
   ```

## Post-Migration Tasks

1. **Update Application Code**: Modify your frontend and backend to use the new schema
2. **Test All QR Code Features**: Ensure creation, scanning, and analytics work correctly
3. **Monitor Performance**: Check that new indexes are being used effectively
4. **Update Documentation**: Update API documentation and user guides
5. **Train Users**: Inform users about any new features or changes

## Support

If you encounter issues during migration:
1. Check the Supabase logs for detailed error messages
2. Verify all foreign key relationships are intact
3. Ensure RLS policies are working correctly
4. Test with a small subset of data first

## Performance Considerations

The new schema includes several performance optimizations:
- **Composite Indexes**: For common query patterns
- **Analytics Tables**: Pre-aggregated data for faster reporting
- **Efficient Validation**: Database-level validation functions
- **Optimized Scans**: Better indexing for scan queries

Monitor your database performance after migration and adjust indexes if needed based on your specific usage patterns.
