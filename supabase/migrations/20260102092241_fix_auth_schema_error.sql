/*
  # Fix Authentication Schema Error
  
  1. Changes
    - Remove foreign key constraint from app_users.auth_user_id to auth.users
    - This constraint causes "Database error querying schema" during login
    - Keep the column but remove the constraint to avoid cross-schema dependencies during auth flow
  
  2. Reason
    - Foreign key constraints from public schema to auth schema can cause issues during authentication
    - The auth service can't properly query auth.users when there are dependent constraints
    - We'll maintain referential integrity through application logic instead
*/

-- Remove the foreign key constraint from auth_user_id to auth.users
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_auth_user_id_fkey;

-- Keep the column and index for lookups, just remove the FK constraint
-- The index already exists from the previous migration
