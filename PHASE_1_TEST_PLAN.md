# Phase 1 - Production Verification Test Plan

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All 3 migration files committed to GitHub
- [ ] Code pushed to main branch
- [ ] Netlify build completed successfully
- [ ] Supabase migrations applied via Dashboard or CLI

---

## Test Suite

Run ALL tests in order. Mark each with ✅ PASS or ❌ FAIL.

---

## TEST 1: Database Migration Verification

### 1.1 Function Fixed ✓
**Location:** Supabase Dashboard → SQL Editor

**Query:**
```sql
SELECT proname, prosecdef, provolatile
FROM pg_proc
WHERE proname = 'get_current_user_role';
```

**Expected Result:**
```
proname                  | prosecdef | provolatile
-------------------------|-----------|------------
get_current_user_role    | t         | s
```

**Verification:**
- [ ] `prosecdef = t` (true) - Has SECURITY DEFINER
- [ ] `provolatile = s` - Is STABLE

### 1.2 No Insecure Policies ✓
**Location:** Supabase Dashboard → SQL Editor

**Query:**
```sql
SELECT COUNT(*) as insecure_count
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
  AND roles @> ARRAY['anon']::name[]
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE');
```

**Expected Result:**
```
insecure_count
--------------
0
```

**Verification:**
- [ ] Count is ZERO (no insecure anonymous write policies)

### 1.3 Role-Based Policies Exist ✓
**Location:** Supabase Dashboard → SQL Editor

**Query:**
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%Authenticated%'
ORDER BY tablename
LIMIT 10;
```

**Expected Result:**
```
Should show policies like:
- "Authenticated users can read appointments"
- "Authenticated users can read batteries"
- etc.
```

**Verification:**
- [ ] Policies exist with "Authenticated" in name
- [ ] Policies use `authenticated` role (not `anon`)

---

## TEST 2: Login Functionality

### 2.1 Admin Login ✓
**Location:** Production URL

**Steps:**
1. Open production URL in incognito window
2. Enter admin credentials:
   - Email: your-admin@email.com
   - Password: your-admin-password
3. Click "Sign In"

**Expected Result:**
- [ ] Login succeeds within 2-3 seconds
- [ ] NO "Permission denied for table users" error
- [ ] NO "Invalid JWT" error
- [ ] Redirects to dashboard
- [ ] User name/email displays in sidebar

**Network Tab Check:**
- [ ] Open DevTools → Network → Filter "app_users"
- [ ] Should see successful 200 response
- [ ] Should NOT see 401 or 403 errors

### 2.2 Sales Rep Login ✓
**Location:** Production URL

**Steps:**
1. Logout from admin account
2. Login with sales rep credentials
3. Verify login succeeds

**Expected Result:**
- [ ] Login succeeds
- [ ] Dashboard loads correctly
- [ ] Sees only own customers (not all customers)

---

## TEST 3: Password Reset End-to-End

### 3.1 Admin Initiates Password Reset ✓
**Location:** Production → User Management

**Steps:**
1. Login as admin
2. Click "User Management" in sidebar
3. Find a test user (or create one)
4. Click "Reset Password" button for that user
5. Read the modal that appears

**Expected Result:**
- [ ] Modal appears with title "Password Reset"
- [ ] Modal shows temporary password (16 characters)
- [ ] Password contains mix of letters, numbers, symbols
- [ ] Modal warns "This password will only be shown once"
- [ ] Copy the temporary password

**Network Tab Check:**
- [ ] Filter for "reset-user-password"
- [ ] Should see POST request to edge function
- [ ] Response status: 200
- [ ] Response body contains `{"password": "...16 chars..."}`

### 3.2 User Logs In With Temp Password ✓
**Location:** Production URL (new incognito window)

**Steps:**
1. Open new incognito window
2. Go to production URL
3. Enter test user's email
4. Enter temporary password from step 3.1
5. Click "Sign In"

**Expected Result:**
- [ ] Login succeeds
- [ ] IMMEDIATELY redirected to "Set New Password" screen
- [ ] Screen shows "First Login - Set Your Password"
- [ ] Cannot access any other pages until password changed

### 3.3 User Sets New Password ✓
**Location:** First Login Password Reset Screen

**Steps:**
1. Enter new password: Test1234!@#$
2. Confirm password: Test1234!@#$
3. Click "Set Password"

**Expected Result:**
- [ ] Password requirements shown (8+ chars, uppercase, lowercase, number, symbol)
- [ ] "Set Password" button enabled when requirements met
- [ ] After clicking, shows "Password updated successfully"
- [ ] Automatically redirects to dashboard
- [ ] Can now access all features normally

**Database Verification:**
```sql
SELECT auth_user_id, first_login, password_last_changed
FROM app_users
WHERE email = 'test-user@email.com';
```

**Expected:**
- [ ] `first_login = false`
- [ ] `password_last_changed` is current timestamp

### 3.4 Old Temp Password No Longer Works ✓
**Location:** Production URL (new incognito window)

**Steps:**
1. Logout
2. Try to login with the temp password from step 3.1

**Expected Result:**
- [ ] Login FAILS
- [ ] Shows "Invalid login credentials"
- [ ] Temp password is no longer valid

### 3.5 New Password Works ✓
**Location:** Production URL

**Steps:**
1. Login with new password set in step 3.3

**Expected Result:**
- [ ] Login succeeds
- [ ] NO forced password change screen
- [ ] Goes directly to dashboard

---

## TEST 4: Role-Based Access Control

### 4.1 Admin Access ✓
**Location:** Production (logged in as admin)

**Steps:**
1. Login as admin
2. Navigate to:
   - Customers → Should see ALL customers
   - User Management → Should see ALL users
   - Admin Panel → Should have access
   - Proposals → Should see ALL proposals

**Expected Result:**
- [ ] Full access to all areas
- [ ] Can see data from all sales reps
- [ ] Can manage users (reset passwords, edit roles)

### 4.2 Sales Rep Access ✓
**Location:** Production (logged in as sales rep)

**Steps:**
1. Login as sales rep
2. Navigate to:
   - Customers → Should see ONLY own customers
   - User Management → Should be restricted or hidden
   - Admin Panel → Should be restricted or hidden
   - Proposals → Should see ONLY own proposals

**Expected Result:**
- [ ] Can only see own data
- [ ] Cannot access admin features
- [ ] Cannot see other reps' customers

### 4.3 Unauthorized Access Blocked ✓
**Location:** Browser DevTools

**Steps:**
1. Logout completely
2. Open DevTools → Console
3. Try to query data directly:
```javascript
const { data, error } = await supabase
  .from('customers')
  .select('*');
console.log(data, error);
```

**Expected Result:**
- [ ] Query returns empty array or error
- [ ] Cannot access data without authentication
- [ ] Network tab shows 401 or returns no rows

---

## TEST 5: Edge Function

### 5.1 Function Is Deployed ✓
**Location:** Supabase Dashboard → Edge Functions

**Steps:**
1. Go to Edge Functions section
2. Find `reset-user-password` function

**Expected Result:**
- [ ] Function exists in list
- [ ] Status shows "ACTIVE" or green indicator
- [ ] JWT verification is ENABLED (verifyJWT: true)

### 5.2 Function Requires Auth ✓
**Location:** Postman or curl

**Test:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/reset-user-password \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'
```

**Expected Result:**
- [ ] Returns 401 Unauthorized
- [ ] Error: "Missing authorization header"

### 5.3 Function Requires Admin Role ✓
**Location:** Postman or curl (with non-admin auth token)

**Test:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/reset-user-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SALES_REP_TOKEN" \
  -d '{"userId": "test-user-id"}'
```

**Expected Result:**
- [ ] Returns 403 Forbidden
- [ ] Error: "Unauthorized: Admin access required"

### 5.4 Function Works for Admin ✓
**Location:** Production UI or Postman (with admin auth token)

**Expected Result:**
- [ ] Returns 200 OK
- [ ] Response contains temporary password
- [ ] User can login with temp password

---

## TEST 6: Security Regression Tests

### 6.1 Cannot Write Without Auth ✓
**Location:** Browser DevTools (logged out)

**Test:**
```javascript
// Try to insert customer without auth
const { data, error } = await supabase
  .from('customers')
  .insert({
    full_name: 'Hacker Test',
    email: 'hacker@test.com'
  });
console.log(error);
```

**Expected Result:**
- [ ] Operation FAILS
- [ ] Returns RLS policy violation error
- [ ] No data inserted

### 6.2 Cannot Delete Without Auth ✓
**Location:** Browser DevTools (logged out)

**Test:**
```javascript
// Try to delete customer without auth
const { error } = await supabase
  .from('customers')
  .delete()
  .eq('id', 'some-customer-id');
console.log(error);
```

**Expected Result:**
- [ ] Operation FAILS
- [ ] Returns RLS policy violation error
- [ ] No data deleted

### 6.3 Cannot Access Other Users' Data ✓
**Location:** Browser DevTools (logged in as sales rep)

**Test:**
```javascript
// Try to access another rep's customer
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('sales_rep', 'OTHER_REP_ID');
console.log(data);
```

**Expected Result:**
- [ ] Returns empty array or filtered results
- [ ] Can only see own customers
- [ ] Cannot bypass RLS with query params

---

## TEST 7: Performance Check

### 7.1 Login Speed ✓
**Test:** Login with admin account

**Expected Result:**
- [ ] Login completes in < 3 seconds
- [ ] No noticeable slowdown from RLS policies

### 7.2 Dashboard Load Speed ✓
**Test:** Navigate to dashboard after login

**Expected Result:**
- [ ] Dashboard loads in < 2 seconds
- [ ] Customer list loads without delay
- [ ] No performance degradation

---

## Test Summary Sheet

Copy this to track your test execution:

```
TEST 1: Database Migration Verification
  [_] 1.1 Function Fixed
  [_] 1.2 No Insecure Policies
  [_] 1.3 Role-Based Policies Exist

TEST 2: Login Functionality
  [_] 2.1 Admin Login
  [_] 2.2 Sales Rep Login

TEST 3: Password Reset End-to-End
  [_] 3.1 Admin Initiates Password Reset
  [_] 3.2 User Logs In With Temp Password
  [_] 3.3 User Sets New Password
  [_] 3.4 Old Temp Password No Longer Works
  [_] 3.5 New Password Works

TEST 4: Role-Based Access Control
  [_] 4.1 Admin Access
  [_] 4.2 Sales Rep Access
  [_] 4.3 Unauthorized Access Blocked

TEST 5: Edge Function
  [_] 5.1 Function Is Deployed
  [_] 5.2 Function Requires Auth
  [_] 5.3 Function Requires Admin Role
  [_] 5.4 Function Works for Admin

TEST 6: Security Regression Tests
  [_] 6.1 Cannot Write Without Auth
  [_] 6.2 Cannot Delete Without Auth
  [_] 6.3 Cannot Access Other Users' Data

TEST 7: Performance Check
  [_] 7.1 Login Speed
  [_] 7.2 Dashboard Load Speed

OVERALL: [_] ALL TESTS PASSED
```

---

## Failure Handling

If any test fails:

1. **STOP** - Do not proceed to Phase 2
2. Check Supabase logs: Dashboard → Logs → Database
3. Check browser console for errors
4. Check Netlify deploy logs
5. Verify migrations applied in correct order
6. See `PHASE_1_ROLLBACK.sql` if rollback needed

---

## Sign-Off

After all tests pass:

**Tested By:** _______________
**Date:** _______________
**Production URL:** _______________
**Supabase Project:** _______________

**Result:** ✅ ALL TESTS PASSED - READY FOR PHASE 2

---

## Next Steps

After Phase 1 verification complete:
1. ✅ Confirm all tests passed
2. ✅ Document any issues found and resolved
3. ✅ Request Phase 2 deployment package
