# Sales Manager Setup Guide

## The Issue

When adding a Sales Manager, the system requires a **PPW Redline** value. This is a mandatory field that cannot be left empty or set to 0.

## Why PPW Redline is Required

The PPW (Price Per Watt) Redline for a Sales Manager is used to calculate override commissions when their sales reps close deals:

**Override Calculation:** `Sales Rep PPW - Manager PPW = Override per Watt`

**Example:**
- Sales Rep PPW: $2.50
- Manager PPW: $2.40
- Override: $0.10 per watt

For a 10kW (10,000W) system:
- Manager Override Commission: 10,000W × $0.10 = $1,000

## How to Add a Sales Manager Successfully

### Step 1: Fill Out Basic Information
1. Click "Add User" button
2. Fill in:
   - Full Name (required)
   - Employee ID (auto-generated if left empty)
   - Email (required)
   - Phone (optional)

### Step 2: Select Role
1. **Role Category:** Select "Management"
2. **Specific Role:** Select "Sales Manager"

### Step 3: Configure PPW Redline (CRITICAL)
When you select "Sales Manager", a section called **"Sales Manager Configuration"** will appear.

**You MUST enter a PPW Redline value:**
- Typical range: $2.30 - $2.50
- Example value: `2.40`
- This represents the manager's base price per watt
- Cannot be 0 or empty

### Step 4: Optional Settings
- **Reporting Manager:** Optional - select if this sales manager reports to someone
- **Status:** Set to "Active" (default)
- **Profile Photo:** Optional

### Step 5: Submit
1. Click "Create User"
2. Open browser DevTools (F12) → Console tab
3. Check for success or error messages

## Debugging with Console Logs

I've added detailed logging to help diagnose any issues. When you click "Create User", check the console for:

### Success Flow:
```
=== USER SUBMIT STARTED ===
Role Category: management
Role: sales_manager
Form Data: {...}
Creating new user...
Step 1: Creating auth user...
Auth user created successfully
Step 2: Inserting user into app_users table...
Insert data: {...}
User inserted successfully
Step 3: Refreshing user list...
=== USER CREATION COMPLETED SUCCESSFULLY ===
```

### If PPW Redline is Missing:
```
=== USER SUBMIT STARTED ===
VALIDATION FAILED: PPW Redline is required for Sales Managers
Current ppw_redline value: 0
```

**Error Message Displayed:** "PPW Redline is required for Sales Managers (e.g., 2.40)"

### If Another Error Occurs:
```
=== USER CREATION FAILED ===
Error: [specific error details]
```

## Common Issues & Solutions

### Issue 1: "PPW Redline is required for Sales Managers"
**Cause:** The PPW Redline field is empty or set to 0
**Solution:** Enter a valid number (e.g., 2.40) in the "Manager PPW Redline ($)" field

### Issue 2: Auth user creation fails
**Cause:** Email already exists or edge function error
**Solution:**
- Check if the email is already registered
- Verify edge function is deployed: `mcp__supabase__list_edge_functions`
- Check function logs in Supabase dashboard

### Issue 3: Database insert fails
**Cause:** Database constraints or RLS policies
**Solution:**
- Check console for specific error
- Verify you're logged in as an admin
- Check RLS policies on `app_users` table

## Example: Adding Your First Sales Manager

**Step-by-step example:**

1. Click "Add User"
2. Fill in:
   - Full Name: `John Smith`
   - Email: `john.smith@company.com`
   - Phone: `(555) 123-4567`
3. Select:
   - Role Category: `Management`
   - Specific Role: `Sales Manager`
4. **Sales Manager Configuration:**
   - Manager PPW Redline: `2.40` ← REQUIRED
5. Leave other fields as default
6. Click "Create User"
7. Check console for success message

## Verifying the Sales Manager Was Created

### Option 1: Check the User List
After clicking "Create User", the form will close and you should see the new user in the list below.

### Option 2: Query the Database
Run this query in Supabase SQL Editor:
```sql
SELECT id, full_name, email, role, role_category, ppw_redline
FROM app_users
WHERE role = 'sales_manager'
ORDER BY created_at DESC;
```

You should see your new sales manager with the PPW Redline value you entered.

## What Happens After Creation

1. **Auth Account Created:** A Supabase auth user is created with a temporary password
2. **Database Record:** User is added to `app_users` table
3. **Optional Invite:** If you checked "Send invitation email", the user receives setup instructions
4. **Available for Assignment:** Sales reps can now select this sales manager when being created

## Next Steps After Adding Sales Manager

### Assign Sales Reps to This Manager
1. Go to "Add User"
2. Select Role Category: "Employee"
3. Select Specific Role: "Sales Representative"
4. In "Sales Rep Configuration":
   - Select your new sales manager in "Sales Manager" dropdown
   - Enter the sales rep's PPW Redline (e.g., 2.50)

### Commission Calculation
Once the sales manager is set up and has sales reps assigned:
- Sales reps earn: `(Rep PPW × System Size) - EPC Gross Total`
- Manager earns override: `(Rep PPW - Manager PPW) × System Size`

## Troubleshooting Checklist

Before clicking "Create User", verify:
- [ ] Full Name is filled in
- [ ] Email is filled in and unique
- [ ] Role Category is set to "Management"
- [ ] Specific Role is set to "Sales Manager"
- [ ] **PPW Redline has a value (e.g., 2.40) and is NOT 0 or empty**
- [ ] Status is set to "Active"

If all boxes are checked and it still fails:
1. Open DevTools Console (F12)
2. Try to create the user
3. Copy the error message from console
4. Check the specific error for more details

## Support

If you continue to have issues:
1. Take a screenshot of the filled-out form
2. Copy the console output (both the form data and any errors)
3. Check the Network tab for failed requests
4. Look for any red error messages on the page
