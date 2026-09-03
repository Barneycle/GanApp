# Database Schemas

This folder contains all database schema files organized by purpose.

## Structure

### Main Schemas
- `schema.sql` - Main database schema (renamed from `supabase_schema_fixed.sql`)
- `attendance_workflow_schema.sql` - Attendance workflow schema
- `qr_code_schema.sql` - QR code schema (v1)
- `qr_code_schema_v2.sql` - QR code schema (v2)
- `storage_policies.sql` - Storage bucket policies
- `notification_triggers.sql` - Notification trigger definitions

### Migrations (`migrations/`)
Database migration scripts for schema changes:
- `migrate_*.sql` - Migration scripts
- `rollback_*.sql` - Rollback scripts
- `update_*.sql` - Update scripts
- `populate_organizations.sql` - Data population script

### Patches (`patches/`)
Database patches, fixes, and utility scripts:
- `add_*.sql` - Add column/feature scripts
- `create_*.sql` - Create table/function scripts
- `fix_*.sql` - Fix/patch scripts
- `drop_*.sql` - Drop table/column scripts
- `cleanup_*.sql` - Cleanup scripts
- `check_*.sql` - Diagnostic/check scripts
- Other utility scripts

## Usage

1. **Initial Setup**: Run `schema.sql` first to set up the base schema
2. **Migrations**: Apply migrations in chronological order as needed
3. **Patches**: Apply patches as needed for fixes and enhancements

## Notes

- Debug and test SQL files have been removed
- All schema files are now organized in this folder structure
- Main schema file is `schema.sql` (previously `supabase_schema_fixed.sql`)

