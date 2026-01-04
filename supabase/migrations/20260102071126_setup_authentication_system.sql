/*
  # Setup Authentication System

  1. Changes
    - Create function to automatically sync auth.users with app_users table
    - Create trigger to call this function on user signup
    - Ensure app_users table is properly set up for authentication flow

  2. Security
    - Function runs with security definer to allow auth.users access
    - Trigger only fires on INSERT to auth.users
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.app_users (id, email, name, role, role_category)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'employee',
    'employee'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
