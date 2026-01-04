/*
  # Add Reporting Manager to App Users

  1. Changes
    - Add `reporting_manager_id` field to `app_users` table
      - References another user in `app_users` (self-referential foreign key)
      - Nullable (not all users have a manager)
      - Allows tracking organizational hierarchy

  2. Details
    - Users in management roles can be assigned as reporting managers
    - Creates a parent-child relationship for organizational structure
    - Enables reporting and permission hierarchies
*/

-- Add reporting_manager_id column to app_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'reporting_manager_id'
  ) THEN
    ALTER TABLE app_users ADD COLUMN reporting_manager_id uuid REFERENCES app_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster manager lookups
CREATE INDEX IF NOT EXISTS idx_app_users_reporting_manager ON app_users(reporting_manager_id);