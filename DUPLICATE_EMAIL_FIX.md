# Duplicate Email Error - Fixed!

## What Happened

When you tried to add the sales manager, the system:
1. Successfully created the auth user in Supabase
2. Then hit an error before completing the process
3. When you tried again, it failed because that email is already registered in Supabase Auth

## What I Fixed

I've improved the error handling to:
1. Check if the email already exists BEFORE trying to create the auth user
2. Show a clear error message if the email is already registered
3. Provide better debugging information in the console

## Current Users in Your Database

Here are the users currently in your system:
- isaias@solveraenergy.com - Admin User (Admin)
- salesrep@test.com - Sales Rep (Employee)
- manager@test.com - Project Manager (Management)
- fieldtech@test.com - Field Tech (Field Tech)

## Solution: Add Your Sales Manager

You have two options:

### Option 1: Use a Different Email (RECOMMENDED)

Simply try again with a different email address:

1. Click "Add User"
2. Fill in:
   - Full Name: e.g., "Sarah Johnson"
   - Email: **Use a NEW email** (e.g., salesmanager@test.com)
   - Phone: Optional
3. Select:
   - Role Category: **Management**
   - Specific Role: **Sales Manager**
4. **Sales Manager Configuration:**
   - Manager PPW Redline: Enter a value like **2.40**
   - This is REQUIRED and cannot be empty or 0
5. Click "Create User"

### Option 2: Clean Up the Orphaned Auth User

If you really need to use the same email address, you'll need to delete the orphaned auth user from Supabase:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Find the user with the email you tried to use
4. Delete that user
5. Return to your CRM and try creating the user again

## Testing the Fix

Try creating a sales manager with these example values:

**User Details:**
- Full Name: `Sales Manager`
- Email: `salesmanager@test.com` (or any NEW email)
- Phone: `(555) 999-8888`

**Role:**
- Role Category: `Management`
- Specific Role: `Sales Manager`

**Sales Manager Configuration:**
- Manager PPW Redline: `2.40`

**What You'll See:**
- If the email is already used, you'll get a clear error: "This email is already registered..."
- If successful, the form will close and the new user will appear in the list
- Check the browser console (F12) for detailed logs

## Understanding PPW Redline

The PPW (Price Per Watt) Redline is critical for sales managers:

**Purpose:** Calculate override commissions when sales reps close deals

**Formula:**
- Sales Rep PPW - Manager PPW = Manager Override per Watt

**Example:**
- Sales Rep PPW: $2.50
- Manager PPW: $2.40
- Manager Override: $0.10 per watt

For a 10kW system:
- Manager earns: 10,000W × $0.10 = $1,000 override

**Typical Values:**
- Sales Manager PPW: $2.30 - $2.45
- Sales Rep PPW: $2.45 - $2.65

## Verification Steps

After creating the sales manager:

1. **Visual Check:** The user should appear in the "All Users" list below the form

2. **Database Check:** Run this query in Supabase SQL Editor:
```sql
SELECT id, full_name, email, role, role_category, ppw_redline
FROM app_users
WHERE role = 'sales_manager'
ORDER BY created_at DESC;
```

3. **Assignment Check:** When adding a new Sales Rep:
   - Go to Add User → Employee → Sales Representative
   - The new sales manager should appear in the "Sales Manager" dropdown

## Console Debugging

With the improved logging, you'll see:

**Success:**
```
=== USER SUBMIT STARTED ===
Checking for existing user with email: salesmanager@test.com
Creating new user...
Step 1: Creating auth user...
Auth user created successfully
Step 2: Inserting user into app_users table...
User inserted successfully
Step 3: Refreshing user list...
=== USER CREATION COMPLETED SUCCESSFULLY ===
```

**If Email Already Exists in app_users:**
```
Checking for existing user with email: salesmanager@test.com
VALIDATION FAILED: User with this email already exists
```

**If Auth User Already Exists:**
```
AUTH USER CREATION FAILED: A user with this email address has already been registered
```

## Common Issues

### Issue: "PPW Redline is required for Sales Managers"
**Solution:** Scroll down to "Sales Manager Configuration" and enter a value (e.g., 2.40)

### Issue: "This email is already registered"
**Solution:** Use a different email OR delete the auth user from Supabase dashboard

### Issue: User created but doesn't show in list
**Solution:**
- Refresh the page
- Check the console for errors
- Verify RLS policies allow you to read the data

## Next Steps After Creating Sales Manager

1. **Assign Sales Reps:**
   - Add User → Employee → Sales Representative
   - Select your new sales manager in the dropdown
   - Set the sales rep's PPW Redline (should be higher than manager's)

2. **Commission Tracking:**
   - When a sales rep closes a deal, both earn commissions
   - Rep commission: (Rep PPW × System Size) - EPC Costs
   - Manager override: (Rep PPW - Manager PPW) × System Size

3. **Verify Commissions:**
   - Go to Admin Panel → Payroll
   - View commission calculations
   - Verify both rep and manager commissions are calculated correctly

## Support

If you continue to have issues:
1. Check the browser console (F12) for detailed error messages
2. Verify you're logged in as an admin
3. Take a screenshot of any error messages
4. Check the Network tab to see which request is failing
