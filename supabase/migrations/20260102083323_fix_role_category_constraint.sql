/*
  # Fix Role Category Constraint

  1. Changes
    - Update role_category constraint to include sales_rep
    - This was missing and causing authentication failures
  
  2. Security
    - No security changes, just fixing constraint
*/

-- Drop the old constraint
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_category_check;

-- Add the updated constraint with all valid role categories
ALTER TABLE app_users ADD CONSTRAINT app_users_role_category_check 
  CHECK (role_category = ANY (ARRAY[
    'employee'::text, 
    'management'::text, 
    'field_tech'::text, 
    'admin'::text,
    'sales_rep'::text
  ]));
