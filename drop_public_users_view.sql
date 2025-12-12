-- =====================================================
-- DROP public.users VIEW
-- This view was created to allow Supabase PostgREST automatic joins,
-- but the codebase uses RPC functions (get_event_participants, get_user_profile)
-- that query auth.users directly, so this view is no longer needed.
-- =====================================================

-- Drop the public.users view
-- CASCADE will automatically drop any dependent views or objects
DROP VIEW IF EXISTS public.users CASCADE;

-- Verify it's been dropped
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
  ) THEN
    RAISE NOTICE 'WARNING: public.users still exists after drop attempt';
  ELSE
    RAISE NOTICE 'SUCCESS: public.users view has been dropped';
  END IF;
END $$;

