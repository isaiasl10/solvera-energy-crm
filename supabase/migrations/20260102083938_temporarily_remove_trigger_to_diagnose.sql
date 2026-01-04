/*
  # Temporarily Remove Trigger to Diagnose Login Issue

  1. Changes
    - Drop the on_auth_user_created trigger to see if it's interfering with login
    - Keep the function but disable the trigger
  
  2. Note
    - This is for diagnostic purposes only
    - If this fixes login, we'll create a better trigger
    - If it doesn't fix login, the issue is elsewhere
*/

-- Drop the trigger (keep the function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
