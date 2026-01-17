/*
  # Fix Infinite Recursion in get_current_user_role Function

  1. Problem
    - get_current_user_role() queries app_users WHERE id = auth.uid()
    - But 'id' is the app_user UUID, not the auth user UUID
    - Should query WHERE auth_user_id = auth.uid()
    - This causes infinite recursion when RLS policies call this function

  2. Solution
    - Fix the function to use auth_user_id column
    - Mark function as SECURITY DEFINER to bypass RLS
    - Mark function as STABLE for better performance

  3. Impact
    - Fixes login permission errors
    - Breaks infinite recursion loop
    - All role-based RLS policies will now work correctly
*/

-- Drop and recreate the function with correct logic
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_role;
END;
$$;
