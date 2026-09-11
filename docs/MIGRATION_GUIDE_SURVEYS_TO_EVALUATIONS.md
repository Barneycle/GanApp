# Migration Guide: Surveys to Evaluations

This guide explains how to migrate your database from "surveys" terminology to "evaluations" terminology.

## Overview

This migration renames:
- `surveys` table → `evaluations` table
- `survey_responses` table → `evaluation_responses` table
- `survey_id` column → `evaluation_id` column
- `survey_notifications` column → `evaluation_notifications` column
- All related indexes, constraints, triggers, and functions

## Prerequisites

1. **Backup your database** before running the migration
2. Ensure you have admin/superuser access to your Supabase database
3. Review the migration script to understand all changes
4. Test the migration on a staging environment first

## Migration Steps

### Step 1: Backup Your Database

```sql
-- Create a backup of your database
-- In Supabase Dashboard: Settings > Database > Backups
-- Or use pg_dump if you have direct access
```

### Step 2: Review the Migration Script

Open `migrate_surveys_to_evaluations.sql` and review all changes to ensure they match your database schema.

### Step 3: Run the Migration

1. Open your Supabase SQL Editor
2. Copy the contents of `migrate_surveys_to_evaluations.sql`
3. Execute the script
4. Verify the migration completed successfully

### Step 4: Verify the Migration

Run these verification queries:

```sql
-- Check that new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('evaluations', 'evaluation_responses');

-- Check that old tables are gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('surveys', 'survey_responses');

-- Check column names
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'evaluation_responses' 
AND column_name = 'evaluation_id';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'evaluations';
```

### Step 5: Update Application Code

Ensure all application code has been updated to use the new terminology:
- ✅ Service files updated
- ✅ Component files updated
- ✅ Route paths updated
- ✅ Database queries updated

## Rollback

If you need to rollback the migration:

1. Open `rollback_evaluations_to_surveys.sql`
2. Execute the rollback script in Supabase SQL Editor
3. Update application code back to use "survey" terminology

## Files Updated

### SQL Migration Files
- `migrate_surveys_to_evaluations.sql` - Main migration script
- `rollback_evaluations_to_surveys.sql` - Rollback script

### Application Code (Already Updated)
- `apps/Web/src/services/evaluationService.ts`
- `apps/Mobile/lib/evaluationService.ts`
- `apps/Web/src/components/sections/CreateEvaluation.jsx`
- `apps/Web/src/components/sections/EditEvaluation.jsx`
- `apps/Web/src/components/sections/EvaluationManagementPage.jsx`
- `apps/Web/src/components/sections/Evaluation.jsx`
- All route definitions
- All service references

## What Gets Migrated

### Tables
- ✅ `surveys` → `evaluations`
- ✅ `survey_responses` → `evaluation_responses`

### Columns
- ✅ `survey_id` → `evaluation_id` (in evaluation_responses)
- ✅ `survey_id` → `evaluation_id` (in attendance_logs, if exists)
- ✅ `survey_notifications` → `evaluation_notifications` (in notification_preferences)

### Indexes
- ✅ All indexes renamed to use "evaluation" terminology

### Constraints
- ✅ Foreign key constraints updated
- ✅ Unique constraints updated

### Functions
- ✅ `notify_survey_availability()` → `notify_evaluation_availability()`
- ✅ `generate_certificate()` - Updated to use evaluations
- ✅ `check_certificate_eligibility()` - Updated to use evaluations

### Triggers
- ✅ `trg_notify_survey_availability` → `trg_notify_evaluation_availability`

### RLS Policies
- ⚠️ RLS policies are dropped and need to be recreated manually
- You'll need to recreate policies with new names referencing `evaluations` and `evaluation_id`

## Post-Migration Tasks

1. **Recreate RLS Policies**: After migration, recreate your Row Level Security policies:
   ```sql
   -- Example: Allow users to view their own evaluation responses
   CREATE POLICY "Users can view own responses" ON evaluation_responses
       FOR SELECT
       USING (user_id = auth.uid());
   
   -- Example: Allow users to create their own responses
   CREATE POLICY "Users can create own responses" ON evaluation_responses
       FOR INSERT
       WITH CHECK (user_id = auth.uid());
   
   -- Add other policies as needed
   ```

2. **Update Views**: If you have custom views, update them to reference the new table names

3. **Update Documentation**: Update any documentation that references surveys

4. **Test Everything**: Thoroughly test all evaluation-related functionality

## Common Issues

### Issue: Foreign Key Constraint Errors
**Solution**: The migration script handles this automatically by dropping and recreating constraints.

### Issue: RLS Policies Not Working
**Solution**: Recreate RLS policies after migration using the new table/column names.

### Issue: Functions Still Reference Old Names
**Solution**: The migration script updates all known functions. Check for any custom functions you may have created.

### Issue: Views Not Updated
**Solution**: The migration script attempts to update views automatically, but you may need to manually update complex views.

## Support

If you encounter issues:
1. Check the Supabase logs for error messages
2. Verify all tables and columns were renamed correctly
3. Ensure application code is using the new terminology
4. Review the rollback script if you need to revert

## Notes

- The migration is designed to be idempotent where possible (using IF EXISTS)
- All data is preserved during the migration
- The migration runs in a transaction, so if it fails, changes are rolled back
- Some operations (like dropping constraints) may require superuser privileges

