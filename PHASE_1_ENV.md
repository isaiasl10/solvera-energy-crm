# Phase 1 - Environment Variables

## Overview
Phase 1 requires NO new environment variables. It uses existing Supabase configuration.

---

## Required Environment Variables

### Frontend (.env or Netlify Environment Variables)

```bash
# Supabase Configuration (EXISTING - no changes)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Google Maps (EXISTING - no changes)
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key

# NREL PVWatts (EXISTING - no changes)
VITE_NREL_API_KEY=your-nrel-api-key
```

### Supabase Edge Functions (Auto-configured)

The `reset-user-password` edge function uses these variables, which are **automatically available** in Supabase Edge Functions:

```bash
# These are PRE-POPULATED by Supabase - DO NOT manually set
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://...
```

---

## Configuration Steps

### ✅ No Action Required for Phase 1

All environment variables needed for Phase 1 are already configured in your existing deployment.

---

## Verification

### Check Frontend Environment Variables (Netlify)

1. Go to Netlify Dashboard
2. Select your site
3. Go to Site settings → Environment variables
4. Verify these exist:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_NREL_API_KEY`

### Check Edge Function Environment Variables (Supabase)

1. Go to Supabase Dashboard → Edge Functions
2. Click on `reset-user-password` function
3. Environment variables are auto-injected (no manual configuration needed)

To verify they're available, check function logs after calling it - should not show "Missing environment variable" errors.

---

## Security Notes

### Service Role Key

The `reset-user-password` edge function uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS and update user passwords.

**Security measures in place:**
1. Function verifies caller is authenticated
2. Function checks caller has `admin` role in `app_users` table
3. Only then uses service role key to reset password
4. Returns 403 if caller is not admin

**Never expose service role key to frontend** - it's only used in edge functions.

---

## Troubleshooting

### "Missing authorization header" Error
**Cause:** Frontend not sending Authorization header
**Fix:** Check that AuthContext is wrapping the app and providing auth token

### "Unauthorized: Admin access required" Error
**Cause:** User doesn't have admin role
**Fix:** Update user's role in `app_users` table:
```sql
UPDATE app_users SET role = 'admin', role_category = 'admin' WHERE auth_user_id = 'user-uuid';
```

### "Missing userId" Error
**Cause:** Frontend not passing userId in request body
**Fix:** Check UserManagement.tsx is passing correct userId to edge function

---

## Changes from Previous Configuration

**Phase 1 introduces:** ZERO new environment variables

**Phase 1 uses:** Existing Supabase configuration only

---

## Future Phases

Phase 2 and Phase 3 may require additional environment variables (to be documented in their respective ENV.md files).

For example:
- Phase 2 may need storage bucket configuration
- Phase 3 may need webhook secrets

These will be documented when delivered.
