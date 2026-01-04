/*
  # Fix RLS Policies for Anonymous Access

  ## Overview
  Updates Row Level Security policies to allow anonymous (unauthenticated) users
  to perform operations on the customers table. This is necessary since the CRM
  application doesn't currently have an authentication system.

  ## Changes
  - Drop existing authenticated-only policies
  - Create new policies that allow anonymous (anon) role access
  - Maintain RLS enabled for security while allowing public access

  ## Security Notes
  - Anonymous users can perform all CRUD operations
  - In production, consider adding authentication and restricting policies
  - Current setup suitable for internal tools or development environments
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view all customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON customers;

-- Create new policies for anonymous access
CREATE POLICY "Allow anonymous users to view customers"
  ON customers
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous users to insert customers"
  ON customers
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to update customers"
  ON customers
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to delete customers"
  ON customers
  FOR DELETE
  TO anon
  USING (true);