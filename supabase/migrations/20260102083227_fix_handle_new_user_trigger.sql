/*
  # Fix handle_new_user Trigger Function

  1. Changes
    - Update trigger to set auth_user_id column properly
    - Set both name and full_name fields
    - Ensure all required fields are populated
  
  2. Security
    - Maintain security definer permissions
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
  user_role_category TEXT;
BEGIN
  -- Check if role is specified in metadata, otherwise default to employee
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');
  user_role_category := COALESCE(NEW.raw_user_meta_data->>'role_category', 'employee');
  
  INSERT INTO public.app_users (
    id, 
    auth_user_id,
    email, 
    name,
    full_name, 
    role, 
    role_category, 
    status
  )
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    user_role,
    user_role_category,
    'active'
  );
  RETURN NEW;
END;
$$;
