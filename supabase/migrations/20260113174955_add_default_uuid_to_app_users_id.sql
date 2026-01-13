/*
  # Add Default UUID to app_users ID Column

  1. Problem
    - The `id` column in `app_users` is NOT NULL but has no default value
    - When inserting a new user, no ID is provided, causing constraint violation
    - Error: "null value in column 'id' violates not-null constraint"

  2. Solution
    - Add `gen_random_uuid()` as the default value for the `id` column
    - This will auto-generate a UUID for every new row

  3. Security
    - This is a standard approach for UUID primary keys
    - No security implications
*/

-- Add default UUID generation to the id column
ALTER TABLE app_users 
ALTER COLUMN id SET DEFAULT gen_random_uuid();
