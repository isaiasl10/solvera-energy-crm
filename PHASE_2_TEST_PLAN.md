# Phase 2 Test Plan - Subcontract Jobs & Proposal Improvements

**Version:** 2.0.0
**Date:** January 17, 2026
**Tester:** _________________

---

## 🎯 TEST OBJECTIVES

1. Verify subcontract_jobs table and workflows function correctly
2. Confirm CustomerQueue filters by proposal_status properly
3. Validate instant pricing updates in proposals (NO page refresh)
4. Ensure photo tickets link correctly to both internal and subcontract jobs
5. Test invoice generation for all job types

---

## ✅ PRE-TEST CHECKLIST

- [ ] All Phase 2 migrations applied
- [ ] Frontend deployed successfully
- [ ] Test user accounts available (Sales Rep, Sales Manager, Admin)
- [ ] Test contractor created in system
- [ ] Test customers with various proposal statuses exist

---

## 🧪 TEST CASES

### TC-001: CustomerQueue Proposal Status Filter

**Priority:** HIGH
**Feature:** CustomerQueue

**Steps:**
1. Log in as Sales Manager or Sales Rep
2. Navigate to Customer Projects Queue
3. Observe the list of customers shown

**Expected Results:**
- ✅ Only customers with proposal_status = 'customer_signed' OR 'closed_deal' are displayed
- ✅ Customers with 'draft', 'in_progress', 'sent_to_customer', or 'lost' are NOT shown
- ✅ Search functionality still works correctly

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-002: Create Detach & Reset Subcontract Job

**Priority:** HIGH
**Feature:** Subcontract Jobs

**Steps:**
1. Navigate to Subcontracting Intake
2. Select job type: "Detach & Reset"
3. Fill in:
   - Contractor: [Select test contractor]
   - Customer Name: "Test Homeowner"
   - Address: "123 Test St"
   - Panel Quantity: 20
   - Price Per Panel: $75.00
   - Detach Date: [Future date]
   - Reset Date: [Future date + 7 days]
4. Click "Create Job"

**Expected Results:**
- ✅ Job created successfully
- ✅ Gross amount auto-calculated: 20 × $75 = $1,500
- ✅ Job appears in subcontract jobs list
- ✅ Invoice number auto-generated (format: SUB-YYYYMMDD-####)

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-003: Create Service Subcontract Job

**Priority:** HIGH
**Feature:** Subcontract Jobs

**Steps:**
1. Navigate to Subcontracting Intake
2. Select job type: "Service"
3. Fill in:
   - Contractor: [Select test contractor]
   - Customer Name: "Test Homeowner 2"
   - Address: "456 Service Ave"
   - Labor Cost: $500
   - Material Cost: $200
4. Click "Create Job"

**Expected Results:**
- ✅ Job created successfully
- ✅ Gross amount defaults to $0 (manual entry required)
- ✅ Net revenue calculated: gross - labor - material
- ✅ Job appears in subcontract jobs list

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-004: Subcontract Job Detail Routing

**Priority:** HIGH
**Feature:** Job Detail Views

**Steps:**
1. Open the detach/reset job created in TC-002
2. Verify the detail page loads
3. Click through tabs: Details, Detach Photos, Reset Photos, Invoice

**Expected Results:**
- ✅ Job details load correctly
- ✅ Tabs are accessible
- ✅ DetachResetJobDetail component renders (not ServiceJobDetail)
- ✅ Workflow status can be updated
- ✅ Pricing fields update net revenue calculation

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-005: Service Job Detail Routing

**Priority:** HIGH
**Feature:** Job Detail Views

**Steps:**
1. Open the service job created in TC-003
2. Verify the detail page loads
3. Click through tabs: Details, Photos, Invoice

**Expected Results:**
- ✅ Job details load correctly
- ✅ ServiceJobDetail component renders (not DetachResetJobDetail)
- ✅ Service-specific fields visible (labor_cost, material_cost)
- ✅ No detach/reset specific fields visible

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-006: Detach Photo Ticket Linkage

**Priority:** HIGH
**Feature:** Photo Tickets

**Steps:**
1. Create a scheduling record for the detach/reset job (appointment_type = 'detach')
2. Navigate to the detach photos tab
3. Upload test photos
4. Check photo checklist items

**Expected Results:**
- ✅ Photo ticket loads correctly
- ✅ Photos upload to 'detach-photos' storage bucket
- ✅ Checklist items save to detach_photos table
- ✅ Photos link to scheduling record via ticket_id
- ✅ Scheduling record links to subcontract_job via subcontract_job_id

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-007: Reset Photo Ticket Linkage

**Priority:** HIGH
**Feature:** Photo Tickets

**Steps:**
1. Create a scheduling record for the detach/reset job (appointment_type = 'reset')
2. Navigate to the reset photos tab
3. Upload test photos
4. Check photo checklist items

**Expected Results:**
- ✅ Photo ticket loads correctly
- ✅ Photos upload to 'reset-photos' storage bucket
- ✅ Checklist items save to reset_photos table
- ✅ Data linkage: reset_photos → scheduling (ticket_id) → subcontract_jobs (subcontract_job_id)

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-008: Service Photo Ticket Linkage

**Priority:** HIGH
**Feature:** Photo Tickets

**Steps:**
1. Create a scheduling record for the service job (appointment_type = 'service')
2. Navigate to the service photos tab
3. Upload test photos
4. Check photo checklist items

**Expected Results:**
- ✅ Photo ticket loads correctly
- ✅ Photos upload to 'service-photos' storage bucket
- ✅ Checklist items save to service_photos table
- ✅ Data linkage correct

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-009: Invoice Generation for Detach/Reset Job

**Priority:** MEDIUM
**Feature:** Invoice System

**Steps:**
1. Open detach/reset job detail
2. Navigate to Invoice tab
3. Click "Generate Invoice" (if not already generated)
4. Click "Download PDF"

**Expected Results:**
- ✅ Invoice displays correctly in browser
- ✅ Shows: panel quantity × price per panel = gross amount
- ✅ PDF downloads successfully
- ✅ PDF matches on-screen invoice exactly
- ✅ Invoice includes payment tracking info (if paid)

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-010: Invoice Generation for Service Job

**Priority:** MEDIUM
**Feature:** Invoice System

**Steps:**
1. Open service job detail
2. Navigate to Invoice tab
3. Click "Generate Invoice" (if not already generated)
4. Click "Download PDF"

**Expected Results:**
- ✅ Invoice displays correctly
- ✅ Shows: labor cost and material cost line items
- ✅ Total matches gross_amount
- ✅ PDF downloads successfully

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-011: Instant Pricing Updates in CreateProposal

**Priority:** HIGH
**Feature:** Proposal Pricing

**Steps:**
1. Navigate to Create New Proposal
2. Enter system size: 10 kW
3. Enter price per watt: $3.00
4. Observe gross amount
5. Add meter fee: $500
6. Observe updated total
7. Add an adder from database

**Expected Results:**
- ✅ Gross amount updates INSTANTLY: 10 × $3.00 = $30,000 (NO page refresh)
- ✅ Total updates INSTANTLY when meter fee added: $30,500
- ✅ Adders load from custom_adders table via proposal_adders junction
- ✅ Total updates when adder added
- ✅ NO page refresh or flicker at any point

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-012: Instant Pricing Updates in ProposalWorkspace

**Priority:** HIGH
**Feature:** Proposal Pricing

**Steps:**
1. Open an existing proposal
2. Change system size
3. Observe pricing updates
4. Change meter fee
5. Add/remove an adder
6. Observe all updates

**Expected Results:**
- ✅ All pricing updates happen INSTANTLY (NO page refresh)
- ✅ Calculations accurate
- ✅ State management via useProposalPricing hook works correctly

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-013: ProposalViewer No Longer Shows "Not Found" Error

**Priority:** HIGH
**Feature:** Proposal Display

**Steps:**
1. Navigate to a customer with an existing proposal
2. Open ProposalViewer
3. Verify proposal loads

**Expected Results:**
- ✅ Proposal loads successfully
- ✅ NO "proposal not found" error
- ✅ All proposal data displays correctly

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-014: Contractor Default Pricing Fields

**Priority:** MEDIUM
**Feature:** Contractor Management

**Steps:**
1. Navigate to Contractor Management
2. Create/edit a contractor
3. Observe new default pricing fields:
   - default_new_install_ppw
   - default_detach_reset_price_per_panel
   - default_service_rate
4. Enter test values and save

**Expected Results:**
- ✅ New fields visible in contractor form
- ✅ Values save successfully
- ✅ Values display in contractor list/detail

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-015: Scheduling Dual Job Sources

**Priority:** MEDIUM
**Feature:** Scheduling

**Steps:**
1. Create scheduling record for internal customer (customer_id set)
2. Create scheduling record for subcontract job (subcontract_job_id set)
3. Verify constraint: EITHER customer_id OR subcontract_job_id (not both, not neither)

**Expected Results:**
- ✅ Internal customer scheduling works (customer_id set, subcontract_job_id NULL)
- ✅ Subcontract job scheduling works (subcontract_job_id set, customer_id NULL)
- ✅ Cannot create record with BOTH set (constraint violation)
- ✅ Cannot create record with NEITHER set (constraint violation)

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-016: Payment Tracking for Subcontract Jobs

**Priority:** MEDIUM
**Feature:** Payment Management

**Steps:**
1. Open a subcontract job (detach/reset or service)
2. Set invoice_sent_date
3. Set invoice_paid_date
4. Select payment_type: CHECK
5. Enter check_number
6. Save

**Expected Results:**
- ✅ All payment fields save correctly
- ✅ Payment info displays in invoice PDF
- ✅ Workflow status can be updated to reflect payment

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-017: Subcontract Jobs DO NOT Appear in CustomerQueue

**Priority:** CRITICAL
**Feature:** Data Separation

**Steps:**
1. Create several subcontract jobs (various types)
2. Navigate to Customer Projects Queue
3. Search for subcontract job customer names
4. Verify they do NOT appear

**Expected Results:**
- ✅ Subcontract jobs NEVER appear in CustomerQueue
- ✅ Only internal customers (job_source = 'internal') with signed proposals appear
- ✅ Subcontract and internal pipelines are completely separate

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

### TC-018: Data Integrity - Auto-Calculations

**Priority:** HIGH
**Feature:** Database Triggers

**Steps:**
1. Create subcontract detach/reset job with:
   - panel_qty: 25
   - price_per_panel: $80
2. Query database directly:
   ```sql
   SELECT gross_amount, labor_cost, material_cost, net_revenue
   FROM subcontract_jobs
   WHERE id = '[job_id]';
   ```

**Expected Results:**
- ✅ gross_amount = 25 × $80 = $2,000 (auto-calculated)
- ✅ net_revenue = gross_amount - labor_cost - material_cost (auto-calculated)
- ✅ Triggers execute correctly on INSERT and UPDATE

**Actual Results:**
[ ] PASS  [ ] FAIL

**Notes:** _________________________________________________________________

---

## 🐛 BUG TRACKING

| Bug ID | Test Case | Description | Severity | Status |
|--------|-----------|-------------|----------|--------|
| BUG-001 | | | | |
| BUG-002 | | | | |
| BUG-003 | | | | |

---

## 📊 TEST SUMMARY

**Total Test Cases:** 18
**Passed:** _____ / 18
**Failed:** _____ / 18
**Pass Rate:** _____%

### Critical Issues Found:
_________________________________________________________________
_________________________________________________________________

### Blockers:
_________________________________________________________________
_________________________________________________________________

### Recommendations:
_________________________________________________________________
_________________________________________________________________

---

## ✅ SIGN-OFF

- [ ] All HIGH priority tests passed
- [ ] All CRITICAL issues resolved
- [ ] No blockers remaining
- [ ] Ready for production deployment

**Tested By:** _________________
**Date:** _________________
**Sign-off:** _________________

---

**END OF TEST PLAN**
