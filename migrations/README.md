# EkoInk Database Migrations

This directory contains SQL migration files for the EkoInk database schema.

## Running Migrations

### Migration 001: Hierarchical Team Management

This migration adds support for team hierarchy with managers, executives, and invite codes.

**To run this migration:**

1. Go to your Supabase project: https://vszhsjpmlufjmmbswvov.supabase.co/project/_/sql
2. Open the SQL Editor
3. Copy the entire contents of `001-hierarchical-teams.sql`
4. Paste it into the SQL Editor
5. Click "Run" or press Cmd/Ctrl + Enter

**What this migration does:**

- Adds `manager_id`, `team_name`, `invite_code`, `is_super_admin`, and `team_id` columns to the `users` table
- Creates a new `teams` table for better team organization
- Creates an `invitations` table to track invite codes
- Updates Row Level Security (RLS) policies to respect the new hierarchy
- Adds helper functions for role-based access control
- Updates note access policies so managers can see their team's notes

**New Features Enabled:**

1. **Role-based Sign-up:**
   - Users can sign up as Rep, Manager, or Executive
   - Managers/Executives get their own account and can invite team members
   - Reps can join via invite code

2. **Invite System:**
   - Managers and Executives can generate invite codes
   - Invite codes can expire
   - Track who used which code

3. **Hierarchical Access:**
   - Reps see only their own data
   - Managers see their team's data
   - Executives see all company data
   - Super admins see everything

## Post-Migration Steps

After running the migration, you'll need to:

1. ✅ Sign-up flow already updated to capture roles
2. ✅ Invite API endpoints already created (`/api/invites/generate` and `/api/invites/validate`)
3. ✅ Dashboard user creation logic already handles invites
4. ⏳ Next: Create manager dashboard (`/dashboard/team`)
5. ⏳ Next: Create executive dashboard (`/dashboard/executive`)
6. ⏳ Next: Create super admin dashboard (`/admin`)
7. ⏳ Next: Build invite management UI

## Verification

To verify the migration worked correctly, run this query in Supabase SQL Editor:

```sql
-- Check that new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('manager_id', 'team_name', 'invite_code', 'is_super_admin', 'team_id');

-- Check that new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('teams', 'invitations');

-- Check that new functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN ('generate_invite_code', 'user_role', 'is_super_admin', 'get_team_members');
```

You should see results for all queries.

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- WARNING: This will delete all team hierarchy data!

-- Drop new tables
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- Drop new columns from users
ALTER TABLE users
  DROP COLUMN IF EXISTS manager_id,
  DROP COLUMN IF EXISTS team_name,
  DROP COLUMN IF EXISTS invite_code,
  DROP COLUMN IF EXISTS is_super_admin,
  DROP COLUMN IF EXISTS team_id;

-- Drop helper functions
DROP FUNCTION IF EXISTS generate_invite_code();
DROP FUNCTION IF EXISTS user_role();
DROP FUNCTION IF EXISTS is_super_admin();
DROP FUNCTION IF EXISTS get_team_members(UUID);

-- Restore original RLS policies (see supabase-migration.sql for originals)
```

## Migration 007: Consolidated Handwriting and Signatures

This migration adds fields for Handwrite.io integration and user signatures.

**To run:** Copy contents of `007-consolidated-handwriting-and-signatures.sql` and run in Supabase SQL Editor.

**What it does:**
- Adds Handwrite.io order tracking fields to `notes` table
- Adds signature image fields to `users` table

## Storage Setup: Signatures Bucket

**Create via Supabase Dashboard:**
1. Go to Storage → Create new bucket
2. Name: `signatures`, Public: `false`, Size limit: `2MB`
3. Allowed types: `image/png, image/jpeg, image/svg+xml`

**Or run this SQL:**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('signatures', 'signatures', false, 2097152, ARRAY['image/png', 'image/jpeg', 'image/svg+xml']);

-- Storage policies for user signatures
CREATE POLICY "Users can upload their own signature"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'signatures' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own signature"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'signatures' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);
```

Storage path: `signatures/{user_id}/signature.png`

## Migration 008: Fact Extraction and Edit Tracking

**Purpose:** Adds structured fact extraction and edit delta tracking for improved AI generation.

**To run:** Copy contents of `008-add-fact-extraction-and-edit-tracking.sql` and run in Supabase SQL Editor.

**What it does:**
- Adds `facts_json` to `calls` table - stores structured facts extracted from transcripts
- Adds `extraction_status` to `calls` table - tracks fact extraction progress
- Adds `edit_delta` to `notes` table - tracks user edits to learn their style
- Creates indexes for performance

**New Features Enabled:**
1. **Fact-based Generation:** AI uses structured facts instead of raw transcripts
2. **Hallucination Prevention:** Only uses facts actually mentioned in calls
3. **Style Learning:** Each edit updates the rep's voice profile automatically
4. **Faster Generation:** Single-shot instead of multi-shot (2-3 sec vs 6-9 sec)

**Verification:**
```sql
-- Check that new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'calls'
AND column_name IN ('facts_json', 'extraction_status');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notes'
AND column_name = 'edit_delta';
```

## Handwrite.io Integration

See `HANDWRITEIO_INTEGRATION.md` for complete integration details, testing checklist, and troubleshooting.
