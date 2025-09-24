-- =====================================================
-- GET REAL IDs AND CREATE TEST QR CODE
-- =====================================================

-- Step 1: Get a real user ID from Supabase auth
-- Run this first to see available users:
SELECT id, email FROM auth.users LIMIT 5;

-- Step 2: Get a real event ID from your events table  
-- Run this to see available events:
SELECT id, title FROM events LIMIT 5;

-- Step 3: Create QR code with real UUIDs
-- Replace the UUIDs below with actual ones from the queries above:

-- Method 1: Direct insert with known UUIDs
/*
INSERT INTO qr_codes (
    code_type, 
    title, 
    created_by, 
    event_id, 
    qr_data, 
    check_in_before_minutes, 
    check_in_during_minutes
) VALUES (
    'event_checkin',
    'Test Event QR',
    'PASTE_REAL_USER_UUID_HERE',  -- From Step 1 query
    'PASTE_REAL_EVENT_UUID_HERE', -- From Step 2 query
    '{"eventId": "PASTE_REAL_EVENT_UUID_HERE", "type": "event_checkin"}',
    60,
    30
);
*/

-- Method 2: Dynamic insert using subqueries (safer approach)
-- This will automatically use the first available user and event:
INSERT INTO qr_codes (
    code_type, 
    title, 
    created_by, 
    event_id, 
    qr_data, 
    check_in_before_minutes, 
    check_in_during_minutes
) VALUES (
    'event_checkin',
    'Test Event QR - ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM events LIMIT 1),
    jsonb_build_object(
        'eventId', (SELECT id FROM events LIMIT 1)::text,
        'type', 'event_checkin',
        'timestamp', extract(epoch from now())
    ),
    60,
    30
);

