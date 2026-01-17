/*
  PHASE 1 ROLLBACK PROCEDURES

  WARNING: Only use this if Phase 1 deployment causes critical issues.

  This file provides SQL to rollback Phase 1 changes if needed.
  Execute sections in order based on what needs to be rolled back.
*/

-- ============================================================================
-- SECTION 1: Rollback Migration 3 (Clean Duplicate Policies)
-- ============================================================================
-- This is the safest to rollback as it's just cleanup.
-- Re-adding duplicate policies won't break anything, just creates redundancy.

-- Restore proposal_obstructions duplicate policies
CREATE POLICY IF NOT EXISTS "Users can create obstructions for own proposals"
  ON proposal_obstructions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can view own proposal obstructions"
  ON proposal_obstructions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Users can update own proposal obstructions"
  ON proposal_obstructions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can delete own proposal obstructions"
  ON proposal_obstructions FOR DELETE
  TO authenticated
  USING (true);

-- Restore proposal_panels duplicate policies
CREATE POLICY IF NOT EXISTS "panels creator can insert"
  ON proposal_panels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "panels creator can read"
  ON proposal_panels FOR SELECT
  TO authenticated
  USING (true);

-- Restore proposal_roof_planes duplicate policies
CREATE POLICY IF NOT EXISTS "roof planes creator can insert"
  ON proposal_roof_planes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "roof planes creator can read"
  ON proposal_roof_planes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "roof planes creator can update"
  ON proposal_roof_planes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "roof planes creator can delete"
  ON proposal_roof_planes FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- SECTION 2: Rollback Migration 2 (Insecure Policies) - NOT RECOMMENDED
-- ============================================================================
/*
  WARNING: DO NOT RUN THIS SECTION UNLESS ABSOLUTELY NECESSARY

  This re-enables insecure policies that allow anonymous write access.
  Only use this if you have a critical production issue that requires
  immediate rollback while you investigate.

  SECURITY RISK: This reopens security vulnerabilities!
*/

-- UNCOMMENT ONLY IF YOU NEED TO ROLLBACK SECURITY FIXES (NOT RECOMMENDED)

/*
-- Re-enable anonymous access to app_users (INSECURE)
DROP POLICY IF EXISTS "Authenticated users can read app_users" ON app_users;
CREATE POLICY "Allow anonymous to read users"
  ON app_users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous to insert users"
  ON app_users FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to update users"
  ON app_users FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to delete users"
  ON app_users FOR DELETE
  TO anon
  USING (true);

-- Re-enable anonymous access to appointments (INSECURE)
DROP POLICY IF EXISTS "Authenticated users can read appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON appointments;

CREATE POLICY "Allow public read access to appointments"
  ON appointments FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access to appointments"
  ON appointments FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access to appointments"
  ON appointments FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to appointments"
  ON appointments FOR DELETE
  TO anon
  USING (true);

-- Re-enable anonymous access to batteries (INSECURE)
DROP POLICY IF EXISTS "Authenticated users can read batteries" ON batteries;
DROP POLICY IF EXISTS "Admins can manage batteries" ON batteries;

CREATE POLICY "Allow public access to batteries"
  ON batteries FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- NOTE: There are 35+ more tables that would need similar rollback.
-- If you truly need to rollback Migration 2, it's better to restore
-- from a database backup taken before applying the migration.
*/

-- ============================================================================
-- SECTION 3: Rollback Migration 1 (User Role Function) - DANGEROUS
-- ============================================================================
/*
  WARNING: DO NOT RUN THIS SECTION

  This would recreate the BROKEN version of get_current_user_role() that
  causes infinite recursion and login failures.

  There is NO valid reason to rollback this fix.
*/

-- DO NOT UNCOMMENT - This recreates the broken function
/*
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- BUG: This queries the wrong column and causes infinite recursion
  SELECT role INTO user_role
  FROM app_users
  WHERE id = auth.uid()  -- WRONG: Should be auth_user_id
  LIMIT 1;

  RETURN user_role;
END;
$$;
*/

-- ============================================================================
-- COMPLETE ROLLBACK PROCEDURE (if all else fails)
-- ============================================================================
/*
  If you need to completely rollback Phase 1, follow these steps:

  1. BACKUP YOUR DATABASE FIRST
     - Supabase Dashboard → Database → Backups → Create Backup

  2. Record current migration state:
     SELECT * FROM supabase_migrations.schema_migrations
     WHERE version LIKE '20260117%'
     ORDER BY version;

  3. Drop the fixed function:
     DROP FUNCTION IF EXISTS get_current_user_role();

  4. Restore from backup taken BEFORE Phase 1 deployment:
     - Supabase Dashboard → Database → Backups → Restore
     - Select backup from before Phase 1 timestamp

  5. Verify database is restored:
     - Check that old policies exist
     - Check that function has old (broken) version

  6. Contact development team to investigate issue before re-attempting Phase 1
*/

-- ============================================================================
-- FORWARD FIX (better than rollback)
-- ============================================================================
/*
  Instead of rolling back, consider fixing forward:

  Problem: Specific policy causing issues
  Solution: Disable that one policy temporarily

  Example:
*/

-- Temporarily disable a problematic policy (replace with actual policy name)
-- ALTER POLICY "problematic_policy_name" ON table_name DISABLE;

-- Then investigate the root cause and fix properly rather than rollback

-- ============================================================================
-- VERIFICATION QUERIES AFTER ROLLBACK
-- ============================================================================

-- Check which migrations are currently applied
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version LIKE '20260117%'
ORDER BY version;

-- Check current function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_current_user_role';

-- Check policy count per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Check for insecure policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
  AND roles @> ARRAY['anon']::name[]
ORDER BY tablename;

-- ============================================================================
-- SUPPORT
-- ============================================================================
/*
  If you needed to rollback Phase 1:

  1. Document the specific error/issue that required rollback
  2. Check Supabase logs for error details
  3. Check browser console for frontend errors
  4. Gather evidence before attempting Phase 1 again
  5. Review test plan to see which test failed

  Common issues and fixes:

  Issue: "Permission denied for table users" still occurs
  Fix: Check that get_current_user_role() function was created with SECURITY DEFINER

  Issue: Cannot login after migration
  Fix: Check that auth_user_id column exists in app_users table

  Issue: Edge function not working
  Fix: Verify function is deployed and has correct verifyJWT setting

  Issue: RLS policies too restrictive
  Fix: Add specific policies for your use case rather than rollback
*/
