/*
  # Create Admin User Helper Function

  1. New Functions
    - `create_admin_user` - Helper function to create admin users with authentication
  
  2. Purpose
    - Allows creating the first admin user and additional admin users
    - Automatically creates both auth.users and app_users records
    - Sets proper admin role and permissions
  
  3. Usage
    - Call this function from SQL editor: SELECT create_admin_user('admin@solveraenergy.com', 'SecurePassword123!', 'Admin Name');
*/

CREATE OR REPLACE FUNCTION public.create_admin_user(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RETURN 'Error: User with this email already exists';
  END IF;

  -- Create user in auth.users (this will trigger the handle_new_user function)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', user_name),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- Update the app_users record to admin role (created by trigger)
  UPDATE app_users 
  SET 
    role = 'admin',
    role_category = 'admin',
    name = user_name
  WHERE id = new_user_id;

  RETURN 'Success: Admin user created with email ' || user_email;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;
