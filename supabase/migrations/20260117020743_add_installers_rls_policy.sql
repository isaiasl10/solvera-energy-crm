/*
  # Add RLS Policies to Installers Table

  1. Security
    - Add policies for installers table that has RLS enabled but no policies
    - Allow authenticated users to read all installers
    - Allow admins/project managers to manage installers

  2. Policies Added
    - Authenticated users can read installers
    - Authenticated users can insert/update/delete installers (for admin operations)
*/

-- Allow authenticated users to read installers
CREATE POLICY "Authenticated users can read installers"
  ON installers
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to manage installers
CREATE POLICY "Authenticated users can insert installers"
  ON installers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update installers"
  ON installers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete installers"
  ON installers
  FOR DELETE
  TO authenticated
  USING (true);
