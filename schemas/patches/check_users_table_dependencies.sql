-- =====================================================
-- CHECK USERS TABLE/VIEW DEPENDENCIES
-- Check if public.users is a table or view, and what depends on it
-- =====================================================

-- Step 1: Check if it's a table or view
SELECT 
  table_type,
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'users';

-- Step 2: Check for foreign key constraints that reference users
SELECT 
  tc.constraint_name,
  tc.table_name AS referencing_table,
  kcu.column_name AS referencing_column,
  ccu.table_schema AS referenced_table_schema,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users'
  AND ccu.table_schema = 'public';

-- Step 3: Check for views that depend on users
SELECT 
  dependent_ns.nspname AS dependent_schema,
  dependent_view.relname AS dependent_view,
  source_ns.nspname AS source_schema,
  source_table.relname AS source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
JOIN pg_namespace source_ns ON source_table.relnamespace = source_ns.oid
WHERE source_table.relname = 'users'
  AND source_ns.nspname = 'public'
  AND dependent_view.relkind = 'v';

-- Step 4: Check for functions/procedures that might reference users
SELECT 
  routine_schema,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_definition LIKE '%users%'
  AND routine_schema = 'public'
LIMIT 20;

