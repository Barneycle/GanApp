-- =====================================================
-- FIX QR CODE RLS POLICIES
-- =====================================================
-- This script ensures that all authenticated users can:
-- 1. Create QR codes for themselves
-- 2. View their own QR codes
-- 3. Update their own QR codes
-- 4. Delete their own QR codes
-- =====================================================

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can create own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can update own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can delete own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Admins can view all QR codes" ON qr_codes;

-- =====================================================
-- RECREATE RLS POLICIES FOR QR CODES TABLE
-- =====================================================

-- Policy 1: Users can view their own QR codes and public QR codes
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

-- Policy 2: Any authenticated user can create QR codes for themselves
CREATE POLICY "Users can create own QR codes" ON qr_codes
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        auth.uid() = created_by AND 
        (owner_id IS NULL OR auth.uid() = owner_id)
    );

-- Policy 3: Users can update their own QR codes
CREATE POLICY "Users can update own QR codes" ON qr_codes
    FOR UPDATE USING (
        auth.uid() = owner_id OR 
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy 4: Users can delete their own QR codes
CREATE POLICY "Users can delete own QR codes" ON qr_codes
    FOR DELETE USING (
        auth.uid() = owner_id OR 
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- =====================================================
-- VERIFY QR CODE SCANS POLICIES
-- =====================================================

-- Drop and recreate scan policies
DROP POLICY IF EXISTS "Users can view scans of own QR codes" ON qr_code_scans;
DROP POLICY IF EXISTS "Anyone can insert scan records" ON qr_code_scans;
DROP POLICY IF EXISTS "QR owners can update scan records" ON qr_code_scans;
DROP POLICY IF EXISTS "QR owners can delete scan records" ON qr_code_scans;

-- Policy 1: Users can view scans of their own QR codes
CREATE POLICY "Users can view scans of own QR codes" ON qr_code_scans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM qr_codes 
            WHERE id = qr_code_id AND 
            (owner_id = auth.uid() OR created_by = auth.uid())
        ) OR
        scanned_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy 2: Authenticated users can insert scan records
CREATE POLICY "Authenticated users can insert scan records" ON qr_code_scans
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- Policy 3: QR code owners can update scan records
CREATE POLICY "QR owners can update scan records" ON qr_code_scans
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM qr_codes 
            WHERE id = qr_code_id AND 
            (owner_id = auth.uid() OR created_by = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy 4: QR code owners can delete scan records
CREATE POLICY "QR owners can delete scan records" ON qr_code_scans
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM qr_codes 
            WHERE id = qr_code_id AND 
            (owner_id = auth.uid() OR created_by = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- =====================================================
-- VERIFY RLS IS ENABLED
-- =====================================================

-- Ensure RLS is enabled on both tables
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code_scans ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =====================================================

-- Grant basic permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON qr_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON qr_code_scans TO authenticated;

-- Grant usage on sequences if they exist
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Run this query to verify policies are in place:
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('qr_codes', 'qr_code_scans')
ORDER BY tablename, policyname;

-- =====================================================
-- CLEAN UP DUPLICATE QR CODES (OPTIONAL)
-- =====================================================

-- If there are duplicate QR codes for the same user/type, keep only the most recent one
-- This is optional and can be run if you have duplicates causing issues

-- First, check for duplicates
SELECT 
    created_by,
    code_type,
    COUNT(*) as count
FROM qr_codes
WHERE code_type IN ('user_profile', 'event_checkin')
GROUP BY created_by, code_type
HAVING COUNT(*) > 1;

-- Uncomment the following to delete duplicates (keeps the most recent one)
/*
DELETE FROM qr_codes
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY created_by, code_type 
                ORDER BY created_at DESC
            ) as rn
        FROM qr_codes
        WHERE code_type = 'user_profile'
    ) t
    WHERE t.rn > 1
);

DELETE FROM qr_codes
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY event_id, code_type 
                ORDER BY created_at DESC
            ) as rn
        FROM qr_codes
        WHERE code_type = 'event_checkin' AND event_id IS NOT NULL
    ) t
    WHERE t.rn > 1
);
*/

-- =====================================================
-- END OF FIX QR CODE POLICIES
-- =====================================================

