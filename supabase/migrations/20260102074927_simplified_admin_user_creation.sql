/*
  # Simplified Admin User Creation

  1. Changes
    - Drop the complex create_admin_user function
    - Provide simpler SQL commands for admin user creation
  
  2. Instructions
    - Admin users should be created via Supabase Dashboard or using the auth.admin API
    - This migration provides a helper to upgrade existing users to admin
*/

DROP FUNCTION IF EXISTS public.create_admin_user(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.upgrade_user_to_admin(user_email TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find the user in app_users
  SELECT * INTO user_record FROM app_users WHERE email = user_email;
  
  IF NOT FOUND THEN
    RETURN 'Error: User not found with email ' || user_email;
  END IF;
  
  -- Update to admin role
  UPDATE app_users 
  SET 
    role = 'admin',
    role_category = 'admin'
  WHERE email = user_email;
  
  RETURN 'Success: User ' || user_email || ' upgraded to admin';
END;
$$;
