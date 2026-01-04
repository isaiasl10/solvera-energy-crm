/*
  # Create Users and Roles Table

  1. New Tables
    - `app_users`
      - `id` (uuid, primary key)
      - `email` (text, unique, required)
      - `full_name` (text, required)
      - `phone` (text)
      - `role` (text, required) - technician, manager, sales_rep, admin
      - `status` (text, default 'active') - active, inactive
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `app_users` table
    - Add policy for anonymous users to read users (for internal app use)
    - Add policy for anonymous users to create/update users (for user management)

  3. Details
    - Stores login credentials and role information for team members
    - Supports four roles: technician, manager, sales_rep, admin
    - Tracks active/inactive status for user account management
*/

-- Create app_users table
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('technician', 'manager', 'sales_rep', 'admin')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_status ON app_users(status);

-- Enable RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (internal app use)
CREATE POLICY "Allow anonymous to read users"
  ON app_users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous to insert users"
  ON app_users FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to update users"
  ON app_users FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous to delete users"
  ON app_users FOR DELETE
  TO anon
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_app_users_updated_at ON app_users;
CREATE TRIGGER trigger_update_app_users_updated_at
BEFORE UPDATE ON app_users
FOR EACH ROW
EXECUTE FUNCTION update_app_users_updated_at();