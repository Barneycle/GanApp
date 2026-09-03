# QR Code Generation Fix Summary

## Problem
Users were getting the error: **"Failed to generate QR code: Cannot coerce the result to a single JSON object"**

This error prevented users from creating QR codes for themselves and for events.

## Root Causes

### 1. **Supabase `.single()` Method Issues**
The code was using `.single()` on Supabase queries, which expects exactly one row to be returned. This method throws the "Cannot coerce to single JSON object" error when:
- Multiple rows are returned
- Row Level Security (RLS) policies block the query
- Query conditions don't match exactly one row

### 2. **QR Token Uniqueness Constraint**
The `qr_token` field has a UNIQUE constraint in the database. For event QR codes, all users were trying to use the same token (JSON stringified event data), causing uniqueness constraint violations.

### 3. **Event QR Code Sharing**
The system was trying to create a single shared QR code per event, but the requirement is for each user to be able to create their own QR code.

## Solutions Implemented

### 1. Fixed GenerateQR.jsx Component

#### Changes Made:
- **Removed `.single()` calls**: Replaced with array-based queries using `.limit(1)`
- **Better error handling**: Properly handle array results instead of assuming single objects
- **Unique QR tokens for events**: Each user+event combination now gets a unique token
- **Fixed query conditions**: Added `created_by` filter for event QR codes

#### Specific Updates:

**Event QR Code Generation (lines 21-108)**:
```javascript
// Before: Used .single() which caused errors
// After: Uses .limit(1) and properly handles array results

// Before: qr_token was the same for all users
const qrDataString = JSON.stringify(qrData);

// After: qr_token is unique per user+event
const qrDataString = `EVENT_${event.id}_USER_${user?.id}_${Date.now()}`;
```

**User QR Code Generation (lines 236-328)**:
```javascript
// Before: Used .single() which caused errors
// After: Uses .limit(1) and properly handles array results

// Checks for existing QR by: created_by + code_type
// Updates by: id (more precise)
// Creates with: unique JWT-based token
```

### 2. Created Database Policy Fix Script

**File**: `fix_qr_code_policies.sql`

This script:
- Drops and recreates all RLS policies for `qr_codes` table
- Ensures any authenticated user can create QR codes
- Allows users to view, update, and delete their own QR codes
- Grants proper permissions to authenticated users
- Includes verification queries
- Includes optional cleanup for duplicate QR codes

### 3. Key Policy Changes

```sql
-- Any authenticated user can create QR codes for themselves
CREATE POLICY "Users can create own QR codes" ON qr_codes
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        auth.uid() = created_by AND 
        (owner_id IS NULL OR auth.uid() = owner_id)
    );

-- Users can view their own QR codes and public ones
CREATE POLICY "Users can view own QR codes" ON qr_codes
    FOR SELECT USING (
        auth.uid() = owner_id OR 
        auth.uid() = created_by OR
        is_public = true OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
        )
    );
```

## How It Works Now

### User QR Codes
1. Each user can create **one** user profile QR code
2. The QR code uses a JWT-based unique token
3. When regenerating, it updates the existing QR code instead of creating a new one
4. Token format: JWT-style signed token with user info

### Event QR Codes
1. Each user can create their **own** QR code for each event
2. QR codes are unique per user+event combination
3. Token format: `EVENT_{eventId}_USER_{userId}_{timestamp}`
4. Multiple users can create QR codes for the same event
5. When regenerating, it updates the user's existing QR code for that event

## Next Steps

### 1. Run the Database Fix Script

Connect to your Supabase database and run:

```sql
-- Run the policy fix script
\i fix_qr_code_policies.sql
```

Or execute it directly in the Supabase SQL Editor.

### 2. Verify the Changes

After running the script, verify that policies are correct:

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('qr_codes', 'qr_code_scans')
ORDER BY tablename, policyname;
```

### 3. Clean Up Duplicates (Optional)

If you have duplicate QR codes in your database, run the cleanup queries in the script (currently commented out).

To check for duplicates:

```sql
SELECT 
    created_by,
    code_type,
    COUNT(*) as count
FROM qr_codes
WHERE code_type IN ('user_profile', 'event_checkin')
GROUP BY created_by, code_type
HAVING COUNT(*) > 1;
```

### 4. Test the Application

1. **Test User QR Code Generation**:
   - Log in as different users
   - Navigate to the QR code generation page
   - Verify each user can generate their own QR code
   - Try regenerating - should update, not create new

2. **Test Event QR Code Generation**:
   - Log in as different users
   - Open an event and generate QR code
   - Verify each user gets their own QR code for the event
   - Verify multiple users can generate QR codes for the same event
   - Try regenerating - should update the user's existing QR code

3. **Test Error Handling**:
   - Try generating QR codes without authentication (should fail gracefully)
   - Check console for any errors
   - Verify error messages are user-friendly

## Files Modified

1. **apps/Web/src/components/sections/GenerateQR.jsx**
   - Fixed `.single()` usage throughout
   - Updated event QR code token generation
   - Improved error handling
   - Better query conditions

2. **fix_qr_code_policies.sql** (NEW)
   - Comprehensive RLS policy fixes
   - Permission grants
   - Verification queries
   - Cleanup scripts

## Technical Details

### Query Pattern Changes

**Before**:
```javascript
const { data, error } = await supabase
  .from('qr_codes')
  .select('*')
  .eq('event_id', event.id)
  .single(); // ❌ Fails if not exactly one row

if (error && error.code !== 'PGRST116') {
  throw error;
}
```

**After**:
```javascript
const { data: existingQRs, error: fetchError } = await supabase
  .from('qr_codes')
  .select('*')
  .eq('event_id', event.id)
  .eq('created_by', user?.id)
  .limit(1); // ✅ Returns array, handles 0 or 1 rows

if (fetchError) {
  throw fetchError;
}

const existingQR = existingQRs && existingQRs.length > 0 ? existingQRs[0] : null;
```

### Database Schema

The `qr_codes` table structure:
```sql
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY,
    code_type qr_code_type NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    owner_id UUID REFERENCES auth.users(id),
    event_id UUID REFERENCES events(id),
    qr_data JSONB NOT NULL,
    qr_token TEXT UNIQUE, -- ⚠️ Must be unique!
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## Benefits

✅ **Every user can now create QR codes** for themselves and events
✅ **No more "single JSON object" errors** - proper array handling
✅ **Unique QR codes per user+event** - no token conflicts
✅ **Better error messages** - users see meaningful errors
✅ **Proper RLS policies** - secure, but not restrictive
✅ **No duplicate QR codes** - updates existing instead of creating new
✅ **Admin override** - admins can view/manage all QR codes

## Troubleshooting

### If users still can't create QR codes:

1. **Check RLS policies are applied**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'qr_codes';
   ```

2. **Verify user authentication**:
   - Check browser console for auth errors
   - Verify `user.id` exists in the AuthContext

3. **Check for unique constraint violations**:
   - Look for `duplicate key value violates unique constraint "qr_codes_qr_token_key"` errors
   - Run duplicate cleanup if needed

4. **Verify permissions**:
   ```sql
   SELECT grantee, privilege_type 
   FROM information_schema.role_table_grants 
   WHERE table_name = 'qr_codes';
   ```

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot coerce to single JSON object" | Using `.single()` with wrong results | Fixed in code - use `.limit(1)` |
| "duplicate key value" | Non-unique qr_token | Fixed - tokens now unique per user |
| "permission denied" | RLS policies too restrictive | Run `fix_qr_code_policies.sql` |
| "QR code not found" | Missing qr_codes record | Check INSERT is succeeding |

## Conclusion

The QR code generation system now properly supports:
- Multiple users creating their own QR codes
- Each user having their own event QR codes
- Proper error handling and database queries
- Secure but permissive RLS policies

All users should now be able to generate and save QR codes to the database without errors.

