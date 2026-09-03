-- =====================================================
-- CREATE get_table_stats FUNCTION
-- =====================================================
-- This function returns statistics about all tables in the public schema
-- including row counts and approximate sizes
-- =====================================================

CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  size_mb NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Loop through all tables in the public schema
  FOR rec IN 
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    BEGIN
      -- Get row count using dynamic SQL
      EXECUTE format('SELECT COUNT(*) FROM %I.%I', rec.schemaname, rec.tablename) INTO row_count;
      
      -- Get table size (approximate, in MB)
      SELECT COALESCE(pg_total_relation_size(format('%I.%I', rec.schemaname, rec.tablename))::NUMERIC / (1024 * 1024), 0) INTO size_mb;
      
      -- Return the row
      table_name := rec.tablename;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      -- Skip tables that can't be accessed (RLS, permissions, etc.)
      CONTINUE;
    END;
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_stats() TO service_role;

-- Add comment
COMMENT ON FUNCTION get_table_stats() IS 'Returns statistics (row count and size) for all tables in the public schema';

