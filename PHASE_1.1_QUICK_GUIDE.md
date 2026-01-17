# Phase 1.1 Quick Deployment Guide

## 🚨 Problem
Password reset returns **401 Invalid JWT** from Supabase Edge Function

## ✅ Solution
Move to Netlify Function with server-side service role key

---

## 📋 Quick Checklist

### 1. Environment Variables (CRITICAL - DO FIRST)

Go to: **Netlify Dashboard → Site settings → Environment variables**

**ADD THIS:**
```
Key:   SUPABASE_SERVICE_ROLE_KEY
Value: [Get from Supabase Dashboard → Settings → API]
```

**VERIFY THESE:**
```
VITE_SUPABASE_URL = https://waqaaujbkpoiavzezlu.supabase.co
  NOTE: NOT "waqaaujbkpoiavzezluh" (no 'h' at end)

VITE_SUPABASE_ANON_KEY = eyJhbGc... [your anon key]
```

### 2. Deploy Code

```bash
# Add files
git add netlify/functions/reset-user-password.js
git add src/components/UserManagement.tsx

# Commit
git commit -m "Phase 1.1: Fix password reset 401 JWT error"

# Push (triggers auto-deploy)
git push origin main
```

### 3. Verify Deployment

**Netlify Dashboard → Functions:**
- [ ] `reset-user-password` appears in list
- [ ] Status shows Active

**Test in Production:**
1. Admin → User Management → Reset Password
2. Check Network tab:
   - URL: `https://YOUR-SITE.netlify.app/.netlify/functions/reset-user-password`
   - Status: `200 OK`
   - Response: `{"password": "..."}`

---

## 📁 Files Changed

1. **NEW:** `netlify/functions/reset-user-password.js`
2. **MODIFIED:** `src/components/UserManagement.tsx` (2 lines)

---

## 🔍 How to Verify It Works

### Network Tab (Chrome DevTools)

**BEFORE (broken):**
```
POST https://waqaaujbkpoiavzezlu.supabase.co/functions/v1/reset-user-password
Status: 401 Unauthorized
Response: {"error": "Invalid JWT"}
```

**AFTER (fixed):**
```
POST https://YOUR-SITE.netlify.app/.netlify/functions/reset-user-password
Status: 200 OK
Response: {"password": "Abc123!@#$..."}
```

### Key Indicators
✅ URL contains `.netlify.app` (not `.supabase.co`)
✅ Status is 200
✅ Response has password field
✅ No 401 errors

---

## ⚠️ Critical: Supabase URL Mismatch

**Your .env file shows:**
```
VITE_SUPABASE_URL=https://waqaaujbkpoiavzezluh.supabase.co
                                              ↑ extra 'h'
```

**Production is:**
```
https://waqaaujbkpoiavzezlu.supabase.co
```

**Action:** Verify Netlify env var has correct URL (no 'h')

---

## 🧪 4-Step Acceptance Test

**Test 1:** Admin clicks reset password → modal shows temp password
**Test 2:** User logs in with temp password → forced password change screen
**Test 3:** User sets new password → redirected to dashboard
**Test 4:** Temp password no longer works → login fails

**ALL MUST PASS**

---

## 🔧 Troubleshooting

### Error: "Server configuration error"
→ Missing SUPABASE_SERVICE_ROLE_KEY in Netlify
→ Add it and redeploy

### Error: "Unauthorized: Admin access required"
→ User doesn't have admin role
→ Update role in database

### Still getting 401
→ Check VITE_SUPABASE_URL in Netlify (verify no 'h')
→ Check VITE_SUPABASE_ANON_KEY matches Supabase

### Function not appearing
→ Check Netlify build logs
→ Verify file: `netlify/functions/reset-user-password.js`

---

## 📊 Status

**Build:** ✅ PASSED
**Files:** ✅ READY
**Env Vars:** ⚠️ MUST ADD SERVICE_ROLE_KEY
**Deploy Time:** 5-10 minutes

---

## 📖 Full Documentation

See `PHASE_1.1_CRITICAL_FIX.md` for complete details.
