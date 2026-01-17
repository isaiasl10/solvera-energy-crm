# Phase 1 - Database Migrations

## Overview
Three migrations fix authentication issues and secure the database with proper RLS policies.

---

## Migration 1: Fix User Role Function
**File:** `20260117022123_fix_user_role_function_infinite_loop.sql`
**Size:** ~972 bytes
**Type:** Function fix

### What It Does
Fixes the `get_current_user_role()` function that was causing infinite recursion and login failures.

### Problem Fixed
- Function was querying `WHERE id = auth.uid()`
- Should query `WHERE auth_user_id = auth.uid()`
- Caused "Permission denied for table users" errors on login
- Created infinite loop when RLS policies called this function

### Changes Made
- Drops and recreates function with correct column reference
- Adds `SECURITY DEFINER` flag to bypass RLS during execution
- Adds `STABLE` flag for better query performance
- Fixes all downstream RLS policies that depend on this function

### Impact
- ✅ Login works without permission errors
- ✅ RLS policies can correctly check user roles
- ✅ No more infinite recursion
- ✅ Better performance with STABLE flag

### Rollback Risk
**LOW** - This is a pure fix. Only risk is if custom code depends on the broken behavior (unlikely).

---

## Migration 2: Remove Insecure RLS Policies
**File:** `20260117022436_remove_all_insecure_rls_policies.sql`
**Size:** ~18KB (large file)
**Type:** Security hardening

### What It Does
Removes 100+ insecure RLS policies and replaces with role-based secure policies.

### Problems Fixed
- Anonymous users could write/delete data with `USING(true)` policies
- No role-based access control
- Critical security vulnerability allowing unauthorized data manipulation

### Tables Affected (38 tables)
- `app_users` - User management
- `appointments` - Scheduling data
- `batteries`, `inverters`, `optimizers`, `panels`, `racking` - Reference data
- `contractors` - Contractor management
- `customers` - Customer data
- `customer_financing` - Financing records
- `custom_adders` - Pricing adders
- `detach_photos`, `reset_photos`, `service_photos` - Photo tickets
- `documents` - Document uploads
- `finance_options` - Financing options
- `inspection_photos`, `installation_photos`, `site_survey_photos` - Photo records
- `installers` - Installer data
- `panel_models` - Panel specifications
- `payroll_periods` - Payroll tracking
- `project_activity_log`, `project_messages` - Project communication
- `project_timeline` - Project workflow
- `proposals` - Proposal data
- `proposal_*` - Proposal design tables (panels, roof planes, obstructions, adders)
- `sales_commissions` - Commission tracking
- `scheduling` - Work tickets
- `subcontract_jobs` - Third party jobs
- `time_clock` - Time tracking

### Policy Changes
**Before:** `USING(true)` on INSERT/UPDATE/DELETE for `anon` role
**After:** Role-based policies for `authenticated` users only

**Read Access:**
- Reference data (batteries, panels, etc.) → All authenticated users
- Operational data → Role-based (own data or managed data)

**Write Access:**
- Reference data management → Admin only
- Operational data → Role-based with ownership checks
- Photos → Field techs for assigned tickets
- Financial data → Management roles only

### New Role-Based Checks
Uses `get_current_user_role()` function to enforce:
- `admin` → Full access to everything
- `project_manager`, `office_manager` → Management operations
- `sales_manager`, `sales_rep` → Customer/proposal access (own or managed)
- `field_tech` → Photo uploads for assigned tickets
- `installer` → Time tracking and work completion

### Impact
- ✅ Blocks anonymous write access completely
- ✅ Enforces authentication requirement
- ✅ Implements proper role-based authorization
- ✅ Maintains read access for authenticated users
- ⚠️ Any unauthenticated operations will now fail (this is intentional)

### Rollback Risk
**MEDIUM** - If any part of the app bypasses authentication, those operations will break. However, the app should always be authenticated, so this is a good break.

---

## Migration 3: Clean Duplicate Policies
**File:** `20260117022539_clean_duplicate_proposal_policies.sql`
**Size:** ~2.3KB
**Type:** Cleanup

### What It Does
Removes redundant overlapping RLS policies on proposal-related tables.

### Problem Fixed
- Multiple policies doing the same thing on same tables
- Confusion about which policy applies
- Potential for policy conflicts

### Tables Cleaned
- `proposal_obstructions` - Removed 9 duplicate policies
- `proposal_panels` - Removed 4 duplicate policies
- `proposal_roof_planes` - Removed 8 duplicate policies

### Policies Removed
All creator-based and granular per-operation policies (redundant with comprehensive ALL policies from Migration 2).

Examples removed:
- "Users can create obstructions for own proposals"
- "obstructions creator can insert"
- "panels creator can read"
- "roof planes creator can update"

### Policies Kept
Comprehensive policies that handle all operations in one place (from Migration 2).

### Impact
- ✅ Simpler policy structure
- ✅ Easier to understand and maintain
- ✅ No change in actual access permissions
- ✅ Reduces policy evaluation overhead

### Rollback Risk
**VERY LOW** - Pure cleanup, maintains same access level.

---

## Migration Application Order

**CRITICAL:** Apply in this exact order:

1. `20260117022123_fix_user_role_function_infinite_loop.sql` - FIRST (fixes function)
2. `20260117022436_remove_all_insecure_rls_policies.sql` - SECOND (uses fixed function)
3. `20260117022539_clean_duplicate_proposal_policies.sql` - THIRD (cleanup)

Applying out of order may cause Migration 2 to fail if the function isn't fixed first.

---

## Verification Queries

### Check Function Is Fixed
```sql
SELECT proname, prosecdef, provolatile
FROM pg_proc
WHERE proname = 'get_current_user_role';
```
**Expected:**
- `prosecdef = true` (SECURITY DEFINER)
- `provolatile = s` (STABLE)

### Check No Insecure Policies Remain
```sql
SELECT COUNT(*) as insecure_count
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
  AND roles @> ARRAY['anon']::name[]
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE');
```
**Expected:** `insecure_count = 0`

### Check Policy Cleanup
```sql
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('proposal_obstructions', 'proposal_panels', 'proposal_roof_planes');
```
**Expected:** Should be lower than before (exact number depends on policies from Migration 2)

---

## Rollback Instructions
See `PHASE_1_ROLLBACK.sql` for complete rollback procedures.

---

## Dependencies

**Frontend:** No changes needed - already implemented
**Backend:** Edge function `reset-user-password` should already be deployed
**Environment:** No new environment variables required

---

## Post-Migration Steps

1. Test login with existing users
2. Test password reset flow
3. Verify role-based access (admin vs sales rep)
4. Check that unauthenticated requests are properly blocked

See `PHASE_1_TEST_PLAN.md` for complete test procedures.
