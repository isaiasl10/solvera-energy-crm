# Save Functionality Fix - Complete Verification Guide

## ROOT CAUSE IDENTIFIED AND FIXED

### Problem
A broken database trigger `update_customers_updated_at` was preventing **ALL** updates to the customers table. The trigger tried to set an `updated_at` column that doesn't exist, causing every update to fail silently.

**Error:** `record "new" has no field "updated_at"`

### Solution
- **Migration:** `fix_customers_table_update_trigger.sql`
- **Action:** Dropped the broken trigger
- **Result:** All customer updates now work correctly

---

## IMPROVEMENTS MADE

### 1. Database Layer
✅ Removed broken trigger that was blocking all updates
✅ Verified all required columns exist in database:
   - `battery_brand` (text)
   - `battery_quantity` (integer)
   - `signature_date` (date)
   - `epc_ppw` (numeric)
   - `epc_base_cost` (numeric)
   - `bom_cost` (numeric)
   - `permit_engineering_cost` (numeric)

### 2. Save Handler Improvements
✅ Changed update to use `.select().single()` to return updated data immediately
✅ Added comprehensive console logging for debugging
✅ Added visible error messages in UI
✅ Improved error handling and reporting

### 3. Code Changes
**File:** `src/components/CustomerProject.tsx`

**Changes:**
1. Added debug logging to track form changes and save operations
2. Improved error display with red alert banner
3. Changed Supabase update to return data:
   ```typescript
   const { data: updatedData, error: updateError } = await supabase
     .from('customers')
     .update(updateData)
     .eq('id', customer.id)
     .select()
     .single();
   ```
4. Better state management after save

---

## VERIFICATION INSTRUCTIONS

### Step 1: Open Browser DevTools
1. Open the application
2. Press F12 to open DevTools
3. Go to Console tab (to see logs)
4. Go to Network tab (to see requests)

### Step 2: Test System Details Tab - Battery Storage Section

#### Fields to Test:
- Battery Brand
- Battery Quantity
- Signature Date

#### Test Procedure:
1. Navigate to a customer project
2. Click "System Details" tab
3. Click "Edit" button in the "Battery Storage" section
4. Change the following fields:
   - Battery Brand: Select "Duracell"
   - Battery Quantity: Enter "2"
   - Signature Date: Select today's date
5. Click "Save"

#### Console Output (What You Should See):
```
=== SAVE STARTED ===
Section: system
Customer ID: [customer-id]
FormData before save: { ... battery_brand: "Duracell", battery_quantity: "2", signature_date: "2026-01-13", ... }
Update payload: { ... battery_brand: "Duracell", battery_quantity: 2, signature_date: "2026-01-13", ... }
Update response - data: { ... battery_brand: "Duracell", battery_quantity: 2, signature_date: "2026-01-13", ... }
SUCCESS - Updated customer data: [full customer object]
=== SAVE COMPLETED SUCCESSFULLY ===
```

#### Network Tab Verification:
1. Find the PATCH request to `/rest/v1/customers?id=eq.[customer-id]`
2. Click on it
3. Go to "Payload" tab
4. **VERIFY:** The payload contains:
   ```json
   {
     "battery_brand": "Duracell",
     "battery_quantity": 2,
     "signature_date": "2026-01-13",
     "system_size_kw": ...,
     "panel_quantity": ...,
     ...other system fields
   }
   ```
5. Go to "Response" tab
6. **VERIFY:** Status is 200 OK
7. **VERIFY:** Response contains the updated customer object with new values

#### UI Verification:
1. The form should close (edit mode ends)
2. The new values should display immediately
3. **No error message** should appear

#### Database Verification:
Run this query in Supabase SQL Editor:
```sql
SELECT id, full_name, battery_brand, battery_quantity, signature_date
FROM customers
WHERE id = '[your-customer-id]';
```
**Expected:** Values match what you just saved

#### Persistence Test:
1. Refresh the page (F5)
2. Navigate back to the customer
3. **VERIFY:** Battery Brand = "Duracell", Battery Quantity = 2, Signature Date = today

---

### Step 3: Test EPC Costs Tab

#### Fields to Test:
- EPC PPW (Price Per Watt)
- BOM Cost
- Permit & Engineering Cost

#### Test Procedure:
1. Click "EPC Costs" tab
2. Click "Edit" button next to "Base EPC Cost"
3. Change EPC PPW to "2.75"
4. Click "Save"

#### Console Output Expected:
```
=== SAVE STARTED ===
Section: epc_pricing
FormData before save: { ... epc_ppw: "2.75", ... }
Update payload: { "epc_ppw": 2.75 }
SUCCESS - Updated customer data: { ... epc_ppw: "2.75", ... }
=== SAVE COMPLETED SUCCESSFULLY ===
```

#### For BOM Cost:
1. Click "BOM" tab under EPC Deductions
2. Click "Edit" next to BOM Cost
3. Enter "5000"
4. Click "Save"

#### For Permit & Engineering Cost:
1. Click "Permit & Engineering" tab
2. Click "Edit" next to Permit & Engineering Cost
3. Enter "2500"
4. Click "Save"

#### Network Verification:
Each save should create a PATCH request with the respective field:
- `{"epc_ppw": 2.75}`
- `{"bom_cost": 5000}`
- `{"permit_engineering_cost": 2500}`

---

### Step 4: Test Adders Tab

#### Fields to Test:
All adder checkboxes (steep roof, metal roof, tile roof, small system, FSU, MPU, critter guard)

#### Test Procedure:
1. Click "Adders" tab
2. Click "Edit"
3. Toggle some adder checkboxes (e.g., check "Steep Roof" and "Metal Roof")
4. Click "Save"

#### Console Output Expected:
```
=== SAVE STARTED ===
Section: adders
Update payload: {
  "adder_steep_roof": true,
  "adder_metal_roof": true,
  "adder_tile_roof": false,
  ...
}
```

#### Network Verification:
PATCH request payload should contain all adder boolean fields.

---

## COMMON ISSUES & TROUBLESHOOTING

### Issue: "UPDATE FAILED" in console
**Check:**
1. Is the user authenticated?
2. Are RLS policies allowing the update?
3. Does the error message mention a specific column?

### Issue: Status 400 "Could not find column in schema cache"
**Solution:** The code is trying to update a column that doesn't exist. Check column name spelling.

### Issue: Status 401/403 Forbidden
**Solution:** RLS policy is blocking the update. Check that:
- User is logged in
- User has appropriate role
- Policy allows UPDATE for this user

### Issue: Values don't persist after refresh
**Check:**
1. Was there an error in the console?
2. Did the Network request succeed (status 200)?
3. Did the update actually happen in the database?

---

## DATABASE TEST QUERIES

### Check Current Values:
```sql
SELECT
  id,
  full_name,
  battery_brand,
  battery_quantity,
  signature_date,
  epc_ppw,
  bom_cost,
  permit_engineering_cost,
  adder_steep_roof,
  adder_metal_roof
FROM customers
WHERE id = '[customer-id]';
```

### Manual Update Test:
```sql
UPDATE customers
SET
  battery_brand = 'Enphase',
  battery_quantity = 3,
  signature_date = '2026-01-13',
  epc_ppw = 2.85,
  bom_cost = 6000,
  permit_engineering_cost = 3000
WHERE id = '[customer-id]'
RETURNING *;
```

If this query works, the database is fine. If it fails, there's a database-level issue.

---

## FILES MODIFIED

1. **supabase/migrations/fix_customers_table_update_trigger.sql** (NEW)
   - Dropped broken trigger

2. **src/components/CustomerProject.tsx**
   - Added console logging throughout save flow
   - Improved error handling and display
   - Changed update to use `.select().single()`
   - Added error banner UI

---

## SUCCESS CRITERIA

✅ Console shows "SAVE COMPLETED SUCCESSFULLY"
✅ Network tab shows PATCH request with status 200
✅ Request payload contains the changed fields
✅ Response contains updated data
✅ UI updates immediately without refresh
✅ Values persist after page refresh
✅ Database query shows updated values
✅ No error messages appear

---

## TESTING CHECKLIST

- [ ] Battery Brand saves and persists
- [ ] Battery Quantity saves and persists
- [ ] Signature Date saves and persists (in both Customer Info and System Details)
- [ ] EPC PPW saves and persists
- [ ] BOM Cost saves and persists
- [ ] Permit Engineering Cost saves and persists
- [ ] Adders (checkboxes) save and persist
- [ ] All changes visible immediately after save
- [ ] All changes persist after browser refresh
- [ ] Console logs show successful save flow
- [ ] Network tab shows successful requests
- [ ] Database queries confirm updates

---

## NOTES

1. **Console Logs:** The extensive logging is for debugging. Remove console.log statements before production deployment.

2. **RLS Policies:** The customers table has permissive policies for anon users. This is intentional for the current setup but should be reviewed for production.

3. **Real-time Updates:** The application uses Supabase real-time subscriptions, so changes made by other users should appear automatically.

4. **Error Display:** Errors now show in a red banner at the top of the page. Click the X to dismiss.
