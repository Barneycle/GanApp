# Query Optimization Notes

## Completed Optimizations

### 1. Activity Logs Service ✅
- **File**: `apps/Web/src/services/activityLogService.ts`
- **Changes**: Replaced `SELECT *` with explicit column lists in:
  - `getActivityLogs()` method
  - `getResourceActivity()` method
- **Impact**: Reduces data transfer for activity log queries

## Remaining Query Optimizations

### High Priority (Large Datasets)

These queries handle large datasets and should be optimized:

1. **Event Service** (`apps/Web/src/services/eventService.ts`)
   - Multiple `SELECT *` queries for events
   - Consider: Events often have large descriptions and JSONB fields
   - Recommendation: Select only needed columns based on use case

2. **Certificate Service** (`apps/Web/src/services/certificateService.ts`)
   - Multiple `SELECT *` queries
   - Consider: Certificates include file URLs and metadata
   - Recommendation: Use specific selects based on the operation

3. **Survey Service** (`apps/Web/src/services/surveyService.ts`)
   - Multiple `SELECT *` queries
   - Consider: Surveys may have large question sets in JSONB
   - Recommendation: Select only needed columns

### Medium Priority

4. **Notification Service** (`apps/Web/src/services/notificationService.ts`)
   - Fewer queries but still using `SELECT *`
   - Recommendation: Specify needed columns

### Optimization Strategy

When optimizing queries:

1. **Identify Required Fields**
   - Review the component/UI that uses the data
   - Determine which fields are actually displayed/used

2. **Create Optimized Selects**
   ```typescript
   // Instead of:
   .select('*')
   
   // Use:
   .select('id, name, title, created_at, status') // Only needed fields
   ```

3. **Consider JSONB Fields**
   - If JSONB fields are large, only select them when needed
   - For list views, consider omitting large JSONB fields

4. **Test After Changes**
   - Ensure UI still displays correctly
   - Verify no missing fields break functionality

## Performance Impact

- **Data Transfer**: Selecting only needed columns reduces network payload
- **Memory Usage**: Less data in memory improves performance
- **Database Load**: Smaller result sets reduce database processing

## Future Considerations

1. **Pagination Improvements**
   - Events list currently uses client-side pagination
   - Consider server-side pagination for better performance with large datasets

2. **Batch User Lookups**
   - Activity logs currently fetches user info one-by-one via RPC
   - Consider batching or using joins for better performance

3. **Database Views**
   - Create materialized views for frequently accessed complex queries
   - Refresh periodically for near-real-time data

