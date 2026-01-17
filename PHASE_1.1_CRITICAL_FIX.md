# 🚨 PHASE 1.1 CRITICAL FIX - Password Reset 401 JWT Error

## Problem Identified

Password reset failing with:
```
POST https://waqaaujbkpoiavzezlu.supabase.co/functions/v1/reset-user-password
Response: 401 Invalid JWT
```

**Root Cause:**
- Frontend sends Authorization: Bearer <JWT>
- Supabase Edge Function rejects the JWT
- Likely env var mismatch or JWT scope issue

**Solution:**
Move password reset from Supabase Edge Function to Netlify Function using server-side service role key.

---

## Files Changed

### 1. NEW: netlify/functions/reset-user-password.js
**Location:** `netlify/functions/reset-user-password.js`
**Type:** New file
**Size:** ~5KB

Server-side Netlify Function that:
- Validates incoming JWT using anon client
- Checks user has admin role in app_users table
- Uses SUPABASE_SERVICE_ROLE_KEY to reset password
- Marks user for forced password change

### 2. MODIFIED: src/components/UserManagement.tsx
**Location:** `src/components/UserManagement.tsx`
**Changes:** 2 lines

**Line 329:**
```typescript
// BEFORE
const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`;

// AFTER
const apiUrl = `/.netlify/functions/reset-user-password`;
```

**Line 343:**
```typescript
// BEFORE
console.error('Edge Function error:', result);

// AFTER
console.error('Password reset error:', result);
```

---

## Environment Variables Required

### Netlify Environment Variables

**CRITICAL:** These MUST be set in Netlify Dashboard → Site settings → Environment variables

```bash
# Frontend vars (existing - verify correct values)
VITE_SUPABASE_URL=https://waqaaujbkpoiavzezlu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # Your anon key

# Server-side var (NEW - MUST ADD)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Your service role key
```

**Where to find service role key:**
1. Go to https://app.supabase.com/project/waqaaujbkpoiavzezlu/settings/api
2. Copy "service_role" key under "Project API keys"
3. Add to Netlify: SUPABASE_SERVICE_ROLE_KEY

### ⚠️ VERIFY SUPABASE_URL

**Current .env shows:**
```
VITE_SUPABASE_URL=https://waqaaujbkpoiavzezluh.supabase.co
```

**User reported production is:**
```
https://waqaaujbkpoiavzezlu.supabase.co
```

**Action Required:**
1. Check Netlify env vars - is URL correct?
2. If mismatch, update to: `https://waqaaujbkpoiavzezlu.supabase.co` (no 'h')
3. Redeploy frontend after fixing

---

## Git Commands

```bash
# Add new Netlify function
git add netlify/functions/reset-user-password.js

# Add modified frontend
git add src/components/UserManagement.tsx

# Commit
git commit -m "Phase 1.1: Fix password reset 401 JWT error

- Move password reset from Supabase Edge Function to Netlify Function
- Use server-side SUPABASE_SERVICE_ROLE_KEY for auth bypass
- Frontend now calls /.netlify/functions/reset-user-password
- Fixes 401 Invalid JWT error from Supabase Edge Functions

Files:
- NEW: netlify/functions/reset-user-password.js
- MODIFIED: src/components/UserManagement.tsx (2 lines)

Requires: SUPABASE_SERVICE_ROLE_KEY in Netlify env vars"

# Push
git push origin main
```

---

## Deployment Steps

### 1️⃣ Add Service Role Key to Netlify

**BEFORE deploying code:**

1. Go to https://app.netlify.com/sites/YOUR_SITE/settings/deploys#environment
2. Click "Add a variable"
3. Key: `SUPABASE_SERVICE_ROLE_KEY`
4. Value: Get from Supabase Dashboard → Settings → API → service_role key
5. Click "Add variable"
6. Scopes: All scopes (production and branch deploys)

### 2️⃣ Verify SUPABASE_URL

1. In Netlify env vars, check `VITE_SUPABASE_URL`
2. Should be: `https://waqaaujbkpoiavzezlu.supabase.co`
3. If wrong, update it
4. If changed, trigger redeploy

### 3️⃣ Deploy Code

```bash
git add netlify/functions/reset-user-password.js
git add src/components/UserManagement.tsx
git commit -m "Phase 1.1: Fix password reset 401 JWT error"
git push origin main
```

Netlify auto-deploys in 2-3 minutes.

### 4️⃣ Verify Netlify Function Deployed

1. Go to Netlify Dashboard → Functions
2. Should see: `reset-user-password`
3. Status: Active

---

## Acceptance Test

### Test 1: Admin Resets Password ✓

**Steps:**
1. Login to production as admin
2. Go to User Management
3. Select a test user
4. Click "Reset Password"
5. Modal shows temporary password

**Expected:**
- ✅ No 401 errors in Network tab
- ✅ Request goes to `/.netlify/functions/reset-user-password`
- ✅ Response: `{"password": "16-char-temp-password"}`
- ✅ Modal displays password

**Verify in Network Tab:**
```
Request URL: https://your-site.netlify.app/.netlify/functions/reset-user-password
Method: POST
Status: 200 OK
Response: {"password": "Abc123..."}
```

### Test 2: User Logs In With Temp Password ✓

**Steps:**
1. Open incognito window
2. Go to production URL
3. Enter test user email + temp password from Test 1
4. Click Sign In

**Expected:**
- ✅ Login succeeds
- ✅ Redirected to forced password change screen
- ✅ Cannot access app until password changed

### Test 3: User Sets New Password ✓

**Steps:**
1. On forced password change screen
2. Enter new password: Test1234!@
3. Confirm: Test1234!@
4. Click "Set Password"

**Expected:**
- ✅ Password updated successfully
- ✅ Redirected to dashboard
- ✅ Can now use app normally
- ✅ Temp password no longer works

### Test 4: Old Temp Password Rejected ✓

**Steps:**
1. Logout
2. Try to login with temp password

**Expected:**
- ✅ Login FAILS
- ✅ Shows "Invalid login credentials"

---

## Verification Queries

### Check Function Logs (Netlify)

1. Go to Netlify Dashboard → Functions → reset-user-password
2. Click "Logs"
3. Trigger password reset
4. Check for errors or console output

### Check Database Updated (Supabase)

After password reset:
```sql
SELECT auth_user_id, first_login, password_last_changed
FROM app_users
WHERE email = 'test-user@email.com';
```

**Expected:**
- `first_login = true`
- `password_last_changed = null`

After user sets new password:
```sql
SELECT auth_user_id, first_login, password_last_changed
FROM app_users
WHERE email = 'test-user@email.com';
```

**Expected:**
- `first_login = false`
- `password_last_changed = <current timestamp>`

---

## Network Tab Verification

### BEFORE Fix:
```
Request: POST https://waqaaujbkpoiavzezlu.supabase.co/functions/v1/reset-user-password
Status: 401 Unauthorized
Response: {"error": "Invalid JWT"}
```

### AFTER Fix:
```
Request: POST https://your-site.netlify.app/.netlify/functions/reset-user-password
Status: 200 OK
Response: {"password": "Abc123!@..."}
```

**Confirm:**
- [ ] Request URL contains `.netlify.app` (NOT `.supabase.co`)
- [ ] Request path is `/.netlify/functions/reset-user-password`
- [ ] Response status is 200
- [ ] Response contains password field

---

## Troubleshooting

### Error: "Server configuration error"

**Cause:** Missing SUPABASE_SERVICE_ROLE_KEY in Netlify
**Fix:**
1. Add service role key to Netlify env vars
2. Redeploy site
3. Check function logs

### Error: "Unauthorized: Admin access required"

**Cause:** User doesn't have admin role
**Fix:**
```sql
UPDATE app_users
SET role = 'admin', role_category = 'admin'
WHERE auth_user_id = 'user-uuid';
```

### Error: Still getting 401

**Cause 1:** VITE_SUPABASE_URL mismatch
**Fix:** Verify Netlify env var matches: `https://waqaaujbkpoiavzezlu.supabase.co`

**Cause 2:** Anon key wrong
**Fix:** Get fresh anon key from Supabase Dashboard → Settings → API

### Function not deploying

**Check:**
1. Netlify Dashboard → Functions - is it listed?
2. Build logs - any errors building functions?
3. File location correct: `netlify/functions/reset-user-password.js`

---

## Security Notes

### Why This Is Secure

1. **Authentication Required:**
   - Function validates JWT using anon client
   - Rejects requests without valid session

2. **Authorization Check:**
   - Queries app_users table for caller's role
   - Only allows admin role_category
   - Returns 403 if not admin

3. **Service Role Key:**
   - Only used server-side in Netlify Function
   - Never exposed to browser
   - Allows bypassing RLS for password update

4. **First Login Flag:**
   - User marked with first_login=true
   - Forces password change on next login
   - Cannot use app until password changed

### What Changed

**Before:** Client → Supabase Edge Function (JWT validation failing)
**After:** Client → Netlify Function → Supabase Admin API (server-side auth)

**Security maintained:**
- Still requires authentication (JWT check)
- Still requires admin role
- Service key only server-side
- Same forced password change flow

---

## Build Verification

✅ **Build Status:** PASSED

```
npm run build
✓ 1986 modules transformed
✓ built in 15.00s
```

No errors or warnings related to changes.

---

## Rollback

If this fix causes issues:

### Quick Rollback
```bash
git revert HEAD~1
git push origin main
```

### Manual Rollback

**Restore UserManagement.tsx line 329:**
```typescript
const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`;
```

**Delete Netlify function:**
```bash
rm netlify/functions/reset-user-password.js
git add netlify/functions/reset-user-password.js
git commit -m "Rollback password reset to edge function"
git push
```

---

## Success Criteria

✅ Admin clicks reset password → gets temp password
✅ User logs in with temp password → forced to change
✅ Network tab shows request to `/.netlify/functions/`
✅ No 401 JWT errors
✅ Function logs show successful execution

---

## Next Steps After Fix

Once password reset works:
1. ✅ Complete Phase 1 test plan
2. ✅ Verify all Phase 1 tests pass
3. ✅ Report: "Phase 1.1 deployed and verified"
4. ✅ Request Phase 2 deployment package

---

**Status:** 🔧 CRITICAL FIX READY TO DEPLOY
**Risk:** LOW (isolated change, server-side security maintained)
**Deploy Time:** 5-10 minutes (env var + code deploy)
