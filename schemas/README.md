# Database schemas

SQL in this folder is a **reference copy** of changes that were applied in Supabase. It is not an automatic migration runner. There is no `supabase/migrations` history in this repo.

## What to use

1. **`schema.sql`** — base schema snapshot.
2. **`migrations/`** — larger, named schema changes. Apply in date/name order only if that change is not already on the database.
3. **`patches/`** — one-off creates, RLS fixes, and functions. Many of these are already applied. Do not re-run `drop_*` or `complete_database_cleanup.sql` on production.
4. **`qr_code_schema_v2.sql`** — current QR schema. `qr_code_schema.sql` is the older v1 copy.
5. **`storage_policies.sql`**, **`notification_triggers.sql`**, **`attendance_workflow_schema.sql`** — supporting snapshots.

## Diagnostic / already-applied (do not treat as setup)

These were written as one-off checks or emergency fixes. Safe to ignore on a new environment unless you are debugging the same issue:

- `patches/check_registration_status.sql` (hard-coded event id)
- `patches/check_trigger_status.sql`
- `patches/check_users_table_dependencies.sql`
- `patches/check_storage_policies.sql`
- `patches/check_rls_and_fix.sql`
- `patches/fix_counts_immediately.sql`
- `patches/fix_participant_counts_now.sql`
- `patches/complete_database_cleanup.sql`
- `patches/drop_indexes.sql`

Keep **`patches/check_email_exists_function.sql`**. That is a live RPC, not a diagnostic.

## New environments

Prefer dumping the current production/staging schema from Supabase over replaying this folder from scratch.
