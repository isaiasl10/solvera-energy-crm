# PHASE 1: Auth/Password Reset + RLS Security - DEPLOYMENT PACKAGE

## Overview
This phase fixes password reset flow and locks down database security with proper RLS policies.

---

## Step 1: Apply Database Migrations

### Migration 1: Fix User Role Function
**Filename:** `20260117022123_fix_user_role_function_infinite_loop.sql`

```sql
/*
  # Fix User Role Function Infinite Loop

  1. Problem
    - get_current_user_role() function causes infinite recursion
    - Uses id = auth.uid() but should use auth_user_id = auth.uid()
    - Causes "Permission denied for table users" errors on login

  2. Solution
    - Drop and recreate function with correct column reference
    - Add SECURITY DEFINER for proper execution context
    - Add STABLE flag for performance

  3. Impact
    - Fixes login permission errors
    - Enables RLS policies to work correctly
*/

DROP FUNCTION IF EXISTS get_current_user_role();

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  RETURN user_role;
END;
$$;
```

### Migration 2: Remove Insecure RLS Policies
**Filename:** `20260117025000_remove_all_insecure_rls_policies.sql`

**Note:** This is a LARGE migration (~400 lines). See the complete file in:
`supabase/migrations/20260117025000_remove_all_insecure_rls_policies.sql`

Key changes:
- Drops 100+ policies with `USING(true)` that allowed anonymous write access
- Replaces with role-based policies using `get_current_user_role()`
- Restricts admin operations to admin role
- Field tech operations to field techs
- Management operations to management roles

### Migration 3: Clean Duplicate Policies
**Filename:** `20260117025100_clean_duplicate_proposal_policies.sql`

```sql
/*
  # Clean Up Duplicate Proposal Policies

  1. Problem
    - Multiple overlapping policies on proposal tables
    - Causes confusion and potential permission conflicts

  2. Solution
    - Keep only the comprehensive ALL policy per table
    - Drop all the granular creator-based policies (redundant)

  3. Impact
    - Simplifies RLS
    - Maintains same access level (authenticated users)
*/

-- Drop duplicate proposal_obstructions policies
DROP POLICY IF EXISTS "Users can create obstructions for own proposals" ON proposal_obstructions;
DROP POLICY IF EXISTS "Users can delete own proposal obstructions" ON proposal_obstructions;
DROP POLICY IF EXISTS "Users can update own proposal obstructions" ON proposal_obstructions;
DROP POLICY IF EXISTS "Users can view own proposal obstructions" ON proposal_obstructions;
DROP POLICY IF EXISTS "obstructions creator can delete" ON proposal_obstructions;
DROP POLICY IF EXISTS "obstructions creator can insert" ON proposal_obstructions;
DROP POLICY IF EXISTS "obstructions creator can read" ON proposal_obstructions;
DROP POLICY IF EXISTS "obstructions creator can update" ON proposal_obstructions;
DROP POLICY IF EXISTS "obstructions_all_via_proposal" ON proposal_obstructions;

-- Drop duplicate proposal_panels policies
DROP POLICY IF EXISTS "panels creator can delete" ON proposal_panels;
DROP POLICY IF EXISTS "panels creator can insert" ON proposal_panels;
DROP POLICY IF EXISTS "panels creator can read" ON proposal_panels;
DROP POLICY IF EXISTS "panels_all_via_proposal" ON proposal_panels;

-- Drop duplicate proposal_roof_planes policies
DROP POLICY IF EXISTS "roof planes creator can delete" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof planes creator can insert" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof planes creator can read" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof planes creator can update" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof_planes_delete_via_proposal" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof_planes_insert_via_proposal" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof_planes_select_via_proposal" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof_planes_update_via_proposal" ON proposal_roof_planes;
```

---

## Step 2: Deploy/Verify Edge Function

The edge function `reset-user-password` should already be deployed. Verify it exists:

```bash
# Check if function is deployed (if using Supabase CLI)
supabase functions list

# Should show:
# - reset-user-password (ACTIVE, verifyJWT: true)
```

**Edge Function Code:** `supabase/functions/reset-user-password/index.ts`
(Already deployed - no changes needed unless you need to redeploy)

---

## Step 3: Apply Migrations to Production

### Option A: Using Supabase CLI
```bash
# Navigate to project directory
cd /path/to/your/project

# Apply migrations
supabase db push

# Or apply specific migrations
supabase migration up
```

### Option B: Using Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste each migration file content
3. Execute in order:
   - Migration 1: fix_user_role_function_infinite_loop.sql
   - Migration 2: remove_all_insecure_rls_policies.sql
   - Migration 3: clean_duplicate_proposal_policies.sql

---

## Step 4: Commit Frontend Changes

The frontend code is already in place. No changes needed for Phase 1.

Files involved (already implemented):
- `src/components/UserManagement.tsx` - Uses edge function for password reset
- `src/components/FirstLoginPasswordReset.tsx` - Forces password change on first login
- `src/components/Login.tsx` - Handles authentication
- `src/contexts/AuthContext.tsx` - Manages auth state

---

## Step 5: Build and Deploy Frontend

```bash
# Build the app
npm run build

# Deploy to Netlify (or your deployment platform)
# Option A: Push to GitHub (if auto-deploy is configured)
git add .
git commit -m "Phase 1: Fix auth and secure RLS policies"
git push origin main

# Option B: Manual Netlify deploy
netlify deploy --prod
```

---

## PRODUCTION VERIFICATION CHECKLIST

Run these tests in your PRODUCTION environment after deployment:

### Test 1: Login Works
```
1. Open production URL
2. Try to log in with existing admin credentials
3. ✓ Should login successfully
4. ✓ Should NOT see "Permission denied for table users"
5. ✓ Should NOT see "Invalid JWT" errors
```

### Test 2: Password Reset Flow
```
1. Login as admin
2. Go to User Management
3. Click "Reset Password" on a user
4. ✓ Confirm modal appears
5. ✓ After reset, temp password displays in modal (one time only)
6. ✓ Copy the temp password
7. Logout
8. Login as the reset user with temp password
9. ✓ Should be forced to change password (FirstLoginPasswordReset screen)
10. ✓ Set new password
11. ✓ Should login successfully with new password
```

### Test 3: RLS Security Check (Admin)
```
1. Login as admin
2. Go to User Management
3. ✓ Should see all users
4. Go to Customers
5. ✓ Should see all customers
6. Go to Admin Panel
7. ✓ Should see all admin features
```

### Test 4: RLS Security Check (Sales Rep)
```
1. Login as sales rep
2. Go to Customers
3. ✓ Should see only own customers
4. Try to access Admin Panel
5. ✓ Should be restricted/hidden
```

### Test 5: Database Security Verification
Run this query in Supabase SQL Editor:

```sql
-- Check for insecure anonymous write policies
SELECT COUNT(*) as insecure_count
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
  AND roles @> ARRAY['anon']::name[]
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE');
```

**Expected Result:** `insecure_count = 0`

### Test 6: Function Verification
Run this query in Supabase SQL Editor:

```sql
-- Verify get_current_user_role function exists
SELECT proname, prosecdef, provolatile
FROM pg_proc
WHERE proname = 'get_current_user_role';
```

**Expected Result:**
- `proname = get_current_user_role`
- `prosecdef = true` (SECURITY DEFINER)
- `provolatile = s` (STABLE)

---

## Rollback Plan

If something goes wrong:

### Rollback Migrations
```bash
# Using Supabase CLI
supabase migration down

# Or manually in SQL Editor
# Re-apply previous migration or drop policies
```

### Rollback Frontend
```bash
# Revert git commits
git revert HEAD~1
git push origin main
```

---

## Files Modified in This Phase

### Database
- `supabase/migrations/20260117022123_fix_user_role_function_infinite_loop.sql` (NEW)
- `supabase/migrations/20260117025000_remove_all_insecure_rls_policies.sql` (NEW)
- `supabase/migrations/20260117025100_clean_duplicate_proposal_policies.sql` (NEW)

### Backend
- `supabase/functions/reset-user-password/index.ts` (ALREADY DEPLOYED)

### Frontend
- No changes (already implemented)

---

## Next Phase

After Phase 1 verification passes, proceed to:
**PHASE 2: Proposal Module Complete**

---

## Support

If any verification step fails:
1. Check Supabase logs: Dashboard → Logs → Database
2. Check browser console for errors
3. Verify migrations were applied in correct order
4. Check that edge function is deployed and active
