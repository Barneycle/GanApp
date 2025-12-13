-- =====================================================
-- DROP mv_event_statistics MATERIALIZED VIEW
-- This materialized view was created for performance optimization,
-- but the codebase queries the underlying tables directly instead.
-- Therefore, this view is not needed and can be safely dropped.
-- =====================================================

-- Drop the materialized view
DROP MATERIALIZED VIEW IF EXISTS mv_event_statistics CASCADE;

-- Verify it's been dropped
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname = 'mv_event_statistics'
  ) THEN
    RAISE NOTICE 'WARNING: mv_event_statistics still exists after drop attempt';
  ELSE
    RAISE NOTICE 'SUCCESS: mv_event_statistics materialized view has been dropped';
  END IF;
END $$;

