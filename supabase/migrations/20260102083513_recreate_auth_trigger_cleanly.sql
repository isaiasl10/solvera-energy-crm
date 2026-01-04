/*
  # Recreate Auth Trigger Cleanly

  1. Changes
    - Drop and recreate the trigger to ensure clean state
    - Simplify the trigger function to minimal operations
  
  2. Security
    - Maintain SECURITY DEFINER for proper permissions
*/

-- Drop trigger if it exists (using DROP TRIGGER with CASCADE to be thorough)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only insert if the user doesn't already exist in app_users
  IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = NEW.id) THEN
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
      COALESCE(
        NEW.raw_user_meta_data->>'name', 
        NEW.raw_user_meta_data->>'full_name', 
        split_part(NEW.email, '@', 1)
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'name', 
        split_part(NEW.email, '@', 1)
      ),
      COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
      COALESCE(NEW.raw_user_meta_data->>'role_category', 'employee'),
      'active'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
