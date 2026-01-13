/*
  # Fix customers table UPDATE trigger

  1. Problem
    - The `update_customers_updated_at` trigger tries to set an `updated_at` column that doesn't exist
    - This causes ALL UPDATE operations on the customers table to fail
    - Users cannot save any changes to customer records

  2. Solution
    - Drop the broken trigger to allow updates to work
    - Note: The customers table doesn't have an updated_at column and doesn't need one

  3. Impact
    - All customer field updates (battery_brand, battery_quantity, signature_date, epc_ppw, etc.) will now persist correctly
*/

-- Drop the broken trigger
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
