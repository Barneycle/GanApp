-- =====================================================
-- COMPLETE DATABASE CLEANUP SCRIPT
-- This script will delete ALL data from tables and storage buckets
-- WARNING: This is irreversible! Make sure you have backups!
-- =====================================================

-- =====================================================
-- STEP 1: DISABLE TRIGGERS AND CONSTRAINTS
-- =====================================================
-- Disable triggers to avoid cascade issues
SET session_replication_role = replica;

-- =====================================================
-- STEP 2: DELETE ALL STORAGE BUCKET CONTENTS
-- =====================================================

-- Delete all files from storage buckets
-- Note: This will delete ALL files in these buckets

-- 1. Delete from event-banners bucket
DELETE FROM storage.objects WHERE bucket_id = 'event-banners';

-- 2. Delete from event-kits bucket  
DELETE FROM storage.objects WHERE bucket_id = 'event-kits';

-- 3. Delete from sponsor-logos bucket
DELETE FROM storage.objects WHERE bucket_id = 'sponsor-logos';

-- 4. Delete from speaker-photos bucket
DELETE FROM storage.objects WHERE bucket_id = 'speaker-photos';

-- 5. Delete from event-programmes bucket
DELETE FROM storage.objects WHERE bucket_id = 'event-programmes';

-- 6. Delete from certificate-templates bucket [[memory:7853907]]
DELETE FROM storage.objects WHERE bucket_id = 'certificate-templates';

-- 7. Delete from generated-certificates bucket
DELETE FROM storage.objects WHERE bucket_id = 'generated-certificates';

-- 8. Delete from event-materials bucket (legacy)
DELETE FROM storage.objects WHERE bucket_id = 'event-materials';

-- 9. Delete from user-avatars bucket
DELETE FROM storage.objects WHERE bucket_id = 'user-avatars';

-- =====================================================
-- STEP 3: DELETE ALL DATA FROM TABLES
-- =====================================================
-- Delete in reverse dependency order to avoid foreign key conflicts

-- Delete from dependent tables first (tables with foreign keys)

-- QR Code related tables (if they exist)
DELETE FROM qr_code_scans;
DELETE FROM qr_code_analytics;
DELETE FROM qr_codes;
DELETE FROM qr_code_templates;

-- QR scans table (legacy)
DELETE FROM qr_scans;

-- Attendance and workflow tables
DELETE FROM attendance_logs;
DELETE FROM attendance_workflow;

-- Survey responses and surveys
DELETE FROM survey_responses;
DELETE FROM surveys;

-- Event registrations
DELETE FROM event_registrations;

-- Event speakers and sponsors (junction tables)
DELETE FROM event_speakers;
DELETE FROM event_sponsors;

-- Speaker and sponsor tables
DELETE FROM guest_speakers;
DELETE FROM sponsors;

-- Certificate related tables
DELETE FROM certificates;
DELETE FROM certificate_templates;

-- Notification tables
DELETE FROM notification_preferences;
DELETE FROM notifications;

-- Mobile sessions
DELETE FROM mobile_sessions;

-- Event cancellation requests
DELETE FROM event_cancellation_requests;

-- Venues table
DELETE FROM venues;

-- Main tables
DELETE FROM events;
DELETE FROM archived_events;
DELETE FROM archived_users;
DELETE FROM users;

-- =====================================================
-- STEP 4: RESET SEQUENCES (if any)
-- =====================================================
-- Reset any sequences that might exist
-- (Most tables use UUID, but some might have sequences)

-- Check and reset sequences if they exist
DO $$
DECLARE
    seq_name text;
BEGIN
    -- Get all sequences and reset them
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || seq_name || ' RESTART WITH 1';
        RAISE NOTICE 'Reset sequence: %', seq_name;
    END LOOP;
END $$;

-- =====================================================
-- STEP 5: RE-ENABLE TRIGGERS AND CONSTRAINTS
-- =====================================================
-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- =====================================================
-- STEP 6: VERIFICATION QUERIES
-- =====================================================
-- Run these to verify cleanup was successful

-- Check table counts (should all be 0)
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'event_registrations', COUNT(*) FROM event_registrations
UNION ALL
SELECT 'surveys', COUNT(*) FROM surveys
UNION ALL
SELECT 'survey_responses', COUNT(*) FROM survey_responses
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'certificates', COUNT(*) FROM certificates
UNION ALL
SELECT 'attendance_logs', COUNT(*) FROM attendance_logs
UNION ALL
SELECT 'guest_speakers', COUNT(*) FROM guest_speakers
UNION ALL
SELECT 'sponsors', COUNT(*) FROM sponsors
UNION ALL
SELECT 'qr_codes', COUNT(*) FROM qr_codes
UNION ALL
SELECT 'venues', COUNT(*) FROM venues;

-- Check storage bucket contents (should all be 0)
SELECT 'Storage Objects' as type, COUNT(*) as file_count FROM storage.objects;

-- Check specific buckets
SELECT 
    bucket_id,
    COUNT(*) as file_count
FROM storage.objects 
GROUP BY bucket_id
ORDER BY bucket_id;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'DATABASE CLEANUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'All data has been deleted from:';
    RAISE NOTICE '- All database tables';
    RAISE NOTICE '- All storage buckets';
    RAISE NOTICE '- All sequences have been reset';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Your database is now completely clean and ready for fresh data.';
    RAISE NOTICE '=====================================================';
END $$;
