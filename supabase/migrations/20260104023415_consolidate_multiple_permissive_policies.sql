/*
  # Consolidate Multiple Permissive RLS Policies
  
  1. Security Improvements
    - Combine multiple permissive policies into single optimized policies
    - Reduces policy evaluation overhead
    - Maintains same security guarantees
  
  2. Tables Affected
    - app_users: Consolidate SELECT policies
    - custom_adders: Consolidate SELECT policies
    - project_messages: Consolidate INSERT and SELECT policies
    - project_timeline: Consolidate SELECT policies
    - sales_commissions: Consolidate SELECT policies
    - scheduling: Consolidate INSERT and SELECT policies
    - time_clock: Consolidate SELECT policies
  
  3. Changes
    - Replace multiple overlapping policies with single comprehensive policies
    - Use OR conditions to combine logic
*/

-- ========================================
-- APP USERS: Consolidate SELECT policies
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can read all app_users" ON public.app_users;
DROP POLICY IF EXISTS "Sales reps can view technicians" ON public.app_users;

CREATE POLICY "Users can view app_users"
  ON public.app_users FOR SELECT
  TO authenticated
  USING (true);

-- ========================================
-- CUSTOM ADDERS: Consolidate SELECT policies
-- ========================================
DROP POLICY IF EXISTS "Allow public access to custom_adders" ON public.custom_adders;
DROP POLICY IF EXISTS "Sales reps can view custom adders" ON public.custom_adders;

CREATE POLICY "Users can view custom adders"
  ON public.custom_adders FOR SELECT
  TO authenticated
  USING (true);

-- ========================================
-- PROJECT MESSAGES: Consolidate policies
-- ========================================
DROP POLICY IF EXISTS "Users can send project messages" ON public.project_messages;
DROP POLICY IF EXISTS "Sales reps can send project messages" ON public.project_messages;
DROP POLICY IF EXISTS "Users can read project messages" ON public.project_messages;
DROP POLICY IF EXISTS "Sales reps can view project messages" ON public.project_messages;

CREATE POLICY "Users can view project messages"
  ON public.project_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can send project messages"
  ON public.project_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ========================================
-- PROJECT TIMELINE: Consolidate SELECT policies
-- ========================================
DROP POLICY IF EXISTS "Allow public read access to project_timeline" ON public.project_timeline;
DROP POLICY IF EXISTS "Sales reps can view project timeline" ON public.project_timeline;

CREATE POLICY "Users can view project timeline"
  ON public.project_timeline FOR SELECT
  TO authenticated
  USING (true);

-- ========================================
-- SALES COMMISSIONS: Consolidate SELECT policies
-- ========================================
DROP POLICY IF EXISTS "Sales reps can view own commissions" ON public.sales_commissions;
DROP POLICY IF EXISTS "Sales managers can view team commissions" ON public.sales_commissions;
DROP POLICY IF EXISTS "Admins can view all commissions" ON public.sales_commissions;
DROP POLICY IF EXISTS "Employees can view all commissions" ON public.sales_commissions;

CREATE POLICY "Users can view sales commissions"
  ON public.sales_commissions FOR SELECT
  TO authenticated
  USING (
    -- Own commissions
    sales_rep_id = (select auth.uid())
    OR
    -- Team commissions (managers)
    sales_manager_id = (select auth.uid())
    OR
    -- All commissions (admins or any authenticated user)
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
    )
  );

-- ========================================
-- SCHEDULING: Consolidate policies
-- ========================================
DROP POLICY IF EXISTS "Allow public access to scheduling" ON public.scheduling;
DROP POLICY IF EXISTS "Sales reps can schedule site surveys" ON public.scheduling;
DROP POLICY IF EXISTS "Sales reps can view scheduling" ON public.scheduling;

CREATE POLICY "Users can view scheduling"
  ON public.scheduling FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create scheduling"
  ON public.scheduling FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ========================================
-- TIME CLOCK: Consolidate SELECT policies
-- ========================================
DROP POLICY IF EXISTS "Users can view own time clock entries" ON public.time_clock;
DROP POLICY IF EXISTS "Admins can view all time clock entries" ON public.time_clock;

CREATE POLICY "Users can view time clock entries"
  ON public.time_clock FOR SELECT
  TO authenticated
  USING (
    -- Own entries
    user_id = (
      SELECT id FROM public.app_users
      WHERE email = (select auth.email())
    )
    OR
    -- All entries (admins and management)
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE email = (select auth.email())
      AND role_category = ANY(ARRAY['admin', 'management'])
    )
  );
