-- =====================================================
-- ADVANCED SCALABILITY INDEXES
-- =====================================================
-- These indexes improve performance for high-traffic operations:
-- 1. Certificate number search (fuzzy search with trigram)
-- 2. Event title full-text search
-- 3. Activity logs time-based queries (partial index for recent data)

-- Note: Run these indexes CONCURRENTLY if the tables have existing data
-- For new installations, you can remove CONCURRENTLY keyword

-- =====================================================
-- 1. Certificate Number Search Index (GIN with trigram)
-- =====================================================
-- Enables fast fuzzy search on certificate numbers
-- Requires pg_trgm extension

-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for certificate number fuzzy search
-- Use CONCURRENTLY if table has existing data (requires no active transaction)
-- For production with existing data, run this outside of a transaction:
-- CREATE INDEX CONCURRENTLY idx_certificates_number_gin 
-- ON certificates USING gin(certificate_number gin_trgm_ops);

-- For new installations or when table is empty, use regular CREATE INDEX:
CREATE INDEX IF NOT EXISTS idx_certificates_number_gin 
ON certificates USING gin(certificate_number gin_trgm_ops);

-- =====================================================
-- 2. Event Title Full-Text Search Index
-- =====================================================
-- Enables fast full-text search on event titles
-- Requires default text search configuration (usually 'english')

-- Create GIN index for event title full-text search
-- Use CONCURRENTLY if table has existing data
-- CREATE INDEX CONCURRENTLY idx_events_title_search 
-- ON events USING gin(to_tsvector('english', title));

-- For new installations or when table is empty:
CREATE INDEX IF NOT EXISTS idx_events_title_search 
ON events USING gin(to_tsvector('english', title));

-- Also add index for description search (optional but useful)
CREATE INDEX IF NOT EXISTS idx_events_description_search 
ON events USING gin(to_tsvector('english', description));

-- =====================================================
-- 3. Activity Logs Time-Based Indexes
-- =====================================================
-- Optimizes queries for recent activity logs

-- Create descending index on created_at (most queries order by DESC)
-- This is more practical than a partial index with NOW() since NOW() is
-- evaluated at index creation time, not query time
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at_desc 
ON activity_logs(created_at DESC);

-- Composite index for user-specific activity log queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created_desc 
ON activity_logs(user_id, created_at DESC);

-- Note: For production databases with large activity_logs tables,
-- consider periodically archiving old logs (older than 1 year) to maintain
-- performance. You can create a partial index on recent data if needed:
-- CREATE INDEX idx_activity_logs_recent ON activity_logs(created_at DESC)
-- WHERE created_at > '2024-01-01'::timestamp; -- Update date as needed

-- =====================================================
-- 4. Additional Performance Indexes
-- =====================================================

-- Certificate verification by number (already exists but ensure it's optimized)
-- The existing idx_certificates_certificate_number should be sufficient
-- But we can verify it's being used effectively

-- Event search by multiple criteria (composite index)
CREATE INDEX IF NOT EXISTS idx_events_status_date 
ON events(status, start_date DESC) 
WHERE status IN ('published', 'draft');

-- Activity logs by resource type and date
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_created_desc 
ON activity_logs(resource_type, resource_id, created_at DESC);

-- =====================================================
-- Verification Queries (run after creating indexes)
-- =====================================================

-- Check if indexes were created successfully:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('certificates', 'events', 'activity_logs')
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

-- Check index usage (after running some queries):
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes 
-- WHERE tablename IN ('certificates', 'events', 'activity_logs')
-- ORDER BY idx_scan DESC;

