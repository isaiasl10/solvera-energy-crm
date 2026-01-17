# Phase 2 Deployment Guide - Subcontract Jobs & Proposal Improvements

**Version:** 2.0.0
**Date:** January 17, 2026
**Status:** ✅ READY FOR DEPLOYMENT

---

## 🎯 OVERVIEW

Phase 2 introduces a complete separation of subcontract jobs from the internal customer pipeline and implements instant pricing updates for proposals via frontend state management.

### Key Changes:
1. **NEW:** `subcontract_jobs` table - Separate data model for ALL external contractor work
2. **NEW:** Detach/Reset/Service job workflows with proper photo ticket integration
3. **FIXED:** Proposal pricing updates instantly via React state (NO page refresh needed)
4. **FIXED:** CustomerQueue now properly filters by `proposal_status`
5. **NEW:** Invoice generation system for subcontract jobs
6. **IMPROVED:** Contractor management with default pricing fields

---

## ⚠️ CRITICAL REQUIREMENTS

### Before Deployment:

1. ✅ **Database backup completed** - NO exceptions
2. ✅ **All Phase 1 migrations applied successfully**
3. ✅ **No users currently editing proposals** - Notify team of brief deployment window
4. ✅ **Environment variables verified** - Check `.env` file has Supabase credentials
5. ✅ **Build completed successfully** - Run `npm run build` to verify

---

## 📦 DEPLOYMENT STEPS

### Step 1: Apply Database Migrations (5 mins)

Run migrations in **EXACT ORDER**:

```bash
# Navigate to Supabase dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

# Migration 1: Create subcontract_jobs table
# File: supabase/migrations/create_subcontract_jobs_tables.sql
# VERIFY: Table created, RLS enabled, triggers working

# Migration 2: Link scheduling to subcontract_jobs
# File: supabase/migrations/link_scheduling_to_subcontract_jobs.sql
# VERIFY: subcontract_job_id column exists in scheduling table

# Migration 3: Document photo ticket linkage
# File: supabase/migrations/enhance_photo_tickets_for_subcontract.sql
# VERIFY: Comments added to photo tables

# Migration 4: Add proposal_status column
# File: supabase/migrations/add_proposal_status_for_queue_filtering.sql
# VERIFY: proposal_status column exists in proposals table

# Migration 5: Add contractor default pricing
# File: supabase/migrations/add_contractor_default_pricing.sql
# VERIFY: default_new_install_ppw, default_service_rate columns exist in contractors table
```

### Step 2: Verify Migrations (2 mins)

```sql
-- Check subcontract_jobs table exists
SELECT * FROM subcontract_jobs LIMIT 1;

-- Check scheduling has subcontract_job_id
SELECT subcontract_job_id FROM scheduling LIMIT 1;

-- Check proposals has proposal_status
SELECT proposal_status FROM proposals LIMIT 1;

-- Check contractors has new pricing fields
SELECT default_new_install_ppw, default_service_rate, default_detach_reset_price_per_panel
FROM contractors LIMIT 1;
```

### Step 3: Deploy Frontend Code (3 mins)

```bash
# Pull latest code
git pull origin main

# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Deploy (method depends on your hosting)
# For Netlify: netlify deploy --prod
# For Vercel: vercel --prod
# For manual: Copy dist/ to your web server
```

### Step 4: Verify Deployment (5 mins)

1. **Test CustomerQueue Filter:**
   - Navigate to Customer Projects Queue
   - Verify ONLY customers with proposals status 'customer_signed' or 'closed_deal' appear
   - Search for a customer and verify filtering works

2. **Test Subcontract Jobs:**
   - Navigate to Subcontracting section
   - Create a test detach/reset job
   - Verify job appears in list
   - Open job detail and verify routing works
   - Check that photo tickets are accessible

3. **Test Proposal Pricing:**
   - Open CreateProposal or ProposalWorkspace
   - Change system size or add a meter fee
   - Verify pricing updates INSTANTLY (no page refresh)
   - Verify adders are loaded from database

4. **Test Invoice Generation:**
   - Open a subcontract job
   - Navigate to Invoice tab
   - Click "Generate Invoice"
   - Verify PDF downloads correctly

---

## 🧪 POST-DEPLOYMENT VERIFICATION

Run through this checklist:

- [ ] CustomerQueue shows only signed/closed deals
- [ ] Subcontract job creation works for all types (new_install, detach_reset, service)
- [ ] Job routing correctly displays ServiceJobDetail or DetachResetJobDetail
- [ ] Photo tickets link properly to scheduling records
- [ ] Invoice generation creates valid PDFs
- [ ] Proposal pricing updates instantly without refresh
- [ ] Contractor management shows new default pricing fields
- [ ] Calendar shows appointments from both internal and subcontract sources (if updated)

---

## 🔄 ROLLBACK PROCEDURE

If critical issues occur:

### Option 1: Quick Rollback (Frontend Only)
```bash
# Revert to previous deployment
git revert HEAD
npm run build
# Deploy previous version
```

### Option 2: Full Rollback (Database + Frontend)

**⚠️ USE WITH CAUTION - Data loss possible**

```sql
-- Drop new tables (will lose all subcontract job data)
DROP TABLE IF EXISTS subcontract_jobs CASCADE;

-- Remove new columns
ALTER TABLE scheduling DROP COLUMN IF EXISTS subcontract_job_id;
ALTER TABLE proposals DROP COLUMN IF EXISTS proposal_status;
ALTER TABLE contractors DROP COLUMN IF EXISTS default_new_install_ppw;
ALTER TABLE contractors DROP COLUMN IF EXISTS default_service_rate;
```

Then deploy previous frontend version as in Option 1.

---

## 📊 MONITORING & METRICS

### What to Monitor:

1. **Supabase Dashboard:**
   - Query performance on subcontract_jobs table
   - RLS policy execution times
   - Storage usage for photo uploads

2. **Application Logs:**
   - Console errors related to subcontract jobs
   - Failed invoice generations
   - Pricing calculation errors

3. **User Feedback:**
   - Report of "proposal not found" errors
   - Subcontract jobs not appearing
   - Photo upload failures

### Success Metrics:

- Zero "proposal not found" errors in ProposalViewer
- < 100ms pricing calculation time in proposals
- 100% subcontract job creation success rate
- All scheduled appointments visible in calendar

---

## 🆘 TROUBLESHOOTING

### Issue: Proposals not showing in CustomerQueue

**Solution:**
```sql
-- Check proposal_status values
SELECT DISTINCT proposal_status FROM proposals;

-- Update any NULL values to 'draft'
UPDATE proposals SET proposal_status = 'draft' WHERE proposal_status IS NULL;
```

### Issue: Subcontract jobs not creating

**Solution:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'subcontract_jobs';

-- Verify authenticated users have access
-- If not, policies may need adjustment (contact dev team)
```

### Issue: Photo tickets not linking

**Solution:**
```sql
-- Verify scheduling record exists
SELECT * FROM scheduling WHERE id = 'TICKET_ID';

-- Check if scheduling has either customer_id OR subcontract_job_id
SELECT customer_id, subcontract_job_id FROM scheduling WHERE id = 'TICKET_ID';
```

### Issue: Invoice PDF not generating

**Solution:**
- Check browser console for errors
- Verify html2canvas and jsPDF libraries loaded
- Test with different browsers (Chrome/Firefox)
- Check for blocked popups preventing download

---

## 📞 SUPPORT CONTACTS

- **Database Issues:** Check Supabase logs first, then contact backend team
- **Frontend Errors:** Check browser console, review deployment logs
- **User Reports:** Document error message, steps to reproduce, affected users

---

## ✅ DEPLOYMENT SIGN-OFF

- [ ] All migrations applied successfully
- [ ] Frontend deployed to production
- [ ] Post-deployment verification completed
- [ ] Team notified of deployment completion
- [ ] Monitoring dashboards checked (no errors)

**Deployed By:** _________________
**Date:** _________________
**Time:** _________________
**Sign-off:** _________________

---

## 📝 NOTES

Add any deployment-specific notes here:

- Any migration warnings encountered?
- Any manual data fixes required?
- Any configuration changes needed?
- Any performance observations?

---

**END OF DEPLOYMENT GUIDE**
