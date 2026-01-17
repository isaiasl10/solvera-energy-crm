/*
  # Optimize Auth RLS Policies for Performance

  1. Performance Improvements
    - Wrap auth functions in SELECT to evaluate once per query instead of per row
    - Significantly improves query performance at scale

  2. Policies Updated
    - app_users: Users can read/update own profile
    - customers: Creator and sales rep policies
    - proposals: Creator policies
    - proposal_panels, proposal_roof_planes, proposal_obstructions: Creator policies
    - sales_commissions, time_clock, profiles: User policies
*/

-- Drop and recreate app_users policies with optimized auth checks
DROP POLICY IF EXISTS "Users can read own profile" ON app_users;
CREATE POLICY "Users can read own profile"
  ON app_users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON app_users;
CREATE POLICY "Users can update own profile"
  ON app_users
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read own profile by email" ON app_users;
CREATE POLICY "Authenticated users can read own profile by email"
  ON app_users
  FOR SELECT
  TO authenticated
  USING (
    email IN (
      SELECT email FROM auth.users WHERE id = (SELECT auth.uid())
    )
  );

-- Optimize customers policies
DROP POLICY IF EXISTS "customers creator can insert" ON customers;
CREATE POLICY "customers creator can insert"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "customers creator can read" ON customers;
CREATE POLICY "customers creator can read"
  ON customers
  FOR SELECT
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "customers creator can update" ON customers;
CREATE POLICY "customers creator can update"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "customers creator can delete" ON customers;
CREATE POLICY "customers creator can delete"
  ON customers
  FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Sales reps can update customers" ON customers;
CREATE POLICY "Sales reps can update customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM app_users WHERE auth_user_id = (SELECT auth.uid()) AND role = 'sales_rep'
    )
  )
  WITH CHECK (
    sales_rep_id IN (
      SELECT id FROM app_users WHERE auth_user_id = (SELECT auth.uid()) AND role = 'sales_rep'
    )
  );

-- Optimize proposals policies
DROP POLICY IF EXISTS "proposals creator can insert" ON proposals;
CREATE POLICY "proposals creator can insert"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "proposals creator can read" ON proposals;
CREATE POLICY "proposals creator can read"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "proposals creator can update" ON proposals;
CREATE POLICY "proposals creator can update"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "proposals creator can delete" ON proposals;
CREATE POLICY "proposals creator can delete"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- Optimize panel_models policy
DROP POLICY IF EXISTS "panel models read" ON panel_models;
CREATE POLICY "panel models read"
  ON panel_models
  FOR SELECT
  TO authenticated
  USING (true);

-- Optimize proposal_panels policies
DROP POLICY IF EXISTS "panels creator can read" ON proposal_panels;
CREATE POLICY "panels creator can read"
  ON proposal_panels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_panels.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "panels creator can insert" ON proposal_panels;
CREATE POLICY "panels creator can insert"
  ON proposal_panels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_panels.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "panels creator can delete" ON proposal_panels;
CREATE POLICY "panels creator can delete"
  ON proposal_panels
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_panels.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "panels_all_via_proposal" ON proposal_panels;
CREATE POLICY "panels_all_via_proposal"
  ON proposal_panels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_panels.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_panels.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

-- Optimize proposal_roof_planes policies
DROP POLICY IF EXISTS "roof planes creator can read" ON proposal_roof_planes;
CREATE POLICY "roof planes creator can read"
  ON proposal_roof_planes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_roof_planes.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "roof planes creator can insert" ON proposal_roof_planes;
CREATE POLICY "roof planes creator can insert"
  ON proposal_roof_planes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_roof_planes.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "roof planes creator can update" ON proposal_roof_planes;
CREATE POLICY "roof planes creator can update"
  ON proposal_roof_planes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_roof_planes.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_roof_planes.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "roof planes creator can delete" ON proposal_roof_planes;
CREATE POLICY "roof planes creator can delete"
  ON proposal_roof_planes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_roof_planes.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "roof_planes_select_via_proposal" ON proposal_roof_planes;
CREATE POLICY "roof_planes_select_via_proposal"
  ON proposal_roof_planes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_roof_planes.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "roof_planes_insert_via_proposal" ON proposal_roof_planes;
CREATE POLICY "roof_planes_insert_via_proposal"
  ON proposal_roof_planes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_roof_planes.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "roof_planes_update_via_proposal" ON proposal_roof_planes;
CREATE POLICY "roof_planes_update_via_proposal"
  ON proposal_roof_planes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_roof_planes.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_roof_planes.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "roof_planes_delete_via_proposal" ON proposal_roof_planes;
CREATE POLICY "roof_planes_delete_via_proposal"
  ON proposal_roof_planes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_roof_planes.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

-- Optimize proposal_obstructions policies
DROP POLICY IF EXISTS "obstructions creator can read" ON proposal_obstructions;
CREATE POLICY "obstructions creator can read"
  ON proposal_obstructions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "obstructions creator can insert" ON proposal_obstructions;
CREATE POLICY "obstructions creator can insert"
  ON proposal_obstructions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "obstructions creator can update" ON proposal_obstructions;
CREATE POLICY "obstructions creator can update"
  ON proposal_obstructions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "obstructions creator can delete" ON proposal_obstructions;
CREATE POLICY "obstructions creator can delete"
  ON proposal_obstructions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own proposal obstructions" ON proposal_obstructions;
CREATE POLICY "Users can view own proposal obstructions"
  ON proposal_obstructions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create obstructions for own proposals" ON proposal_obstructions;
CREATE POLICY "Users can create obstructions for own proposals"
  ON proposal_obstructions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own proposal obstructions" ON proposal_obstructions;
CREATE POLICY "Users can update own proposal obstructions"
  ON proposal_obstructions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own proposal obstructions" ON proposal_obstructions;
CREATE POLICY "Users can delete own proposal obstructions"
  ON proposal_obstructions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "obstructions_all_via_proposal" ON proposal_obstructions;
CREATE POLICY "obstructions_all_via_proposal"
  ON proposal_obstructions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_obstructions.proposal_id
      AND proposals.created_by = (SELECT auth.uid())
    )
  );

-- Optimize sales_commissions policy
DROP POLICY IF EXISTS "Users can view sales commissions" ON sales_commissions;
CREATE POLICY "Users can view sales commissions"
  ON sales_commissions
  FOR SELECT
  TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM app_users WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- Optimize time_clock policies
DROP POLICY IF EXISTS "Users can insert own time entries" ON time_clock;
CREATE POLICY "Users can insert own time entries"
  ON time_clock
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own time entries" ON time_clock;
CREATE POLICY "Users can update own time entries"
  ON time_clock
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own time entries" ON time_clock;
CREATE POLICY "Users can view own time entries"
  ON time_clock
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- Optimize profiles policies
DROP POLICY IF EXISTS "profiles read own" ON profiles;
CREATE POLICY "profiles read own"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles update own" ON profiles;
CREATE POLICY "profiles update own"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles insert own" ON profiles;
CREATE POLICY "profiles insert own"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));
