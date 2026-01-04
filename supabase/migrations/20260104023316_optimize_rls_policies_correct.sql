/*
  # Optimize RLS Policy Auth Function Calls
  
  1. Performance Improvements
    - Replace auth.uid() and auth.email() with (select auth.uid()) and (select auth.email())
    - This evaluates the function once per query instead of once per row
    - Significantly improves query performance at scale
  
  2. Tables Affected
    - time_clock
    - project_activity_log
    - platform_admins
    - app_users
    - organizations
    - project_messages
    - customers
    - documents
    - project_timeline
    - scheduling
    - custom_adders
    - sales_commissions
  
  3. Security
    - All policies maintain the same security rules
    - Only optimization changes applied
*/

-- ========================================
-- TIME CLOCK POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can view own time clock entries" ON public.time_clock;
DROP POLICY IF EXISTS "Users can insert own time clock entries" ON public.time_clock;
DROP POLICY IF EXISTS "Users can update own time clock entries" ON public.time_clock;
DROP POLICY IF EXISTS "Admins can view all time clock entries" ON public.time_clock;

CREATE POLICY "Users can view own time clock entries"
  ON public.time_clock FOR SELECT
  TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.app_users
      WHERE email = (select auth.email())
    )
  );

CREATE POLICY "Users can insert own time clock entries"
  ON public.time_clock FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (
      SELECT id FROM public.app_users
      WHERE email = (select auth.email())
    )
  );

CREATE POLICY "Users can update own time clock entries"
  ON public.time_clock FOR UPDATE
  TO authenticated
  USING (
    user_id = (
      SELECT id FROM public.app_users
      WHERE email = (select auth.email())
    )
  )
  WITH CHECK (
    user_id = (
      SELECT id FROM public.app_users
      WHERE email = (select auth.email())
    )
  );

CREATE POLICY "Admins can view all time clock entries"
  ON public.time_clock FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE email = (select auth.email())
      AND role_category = ANY(ARRAY['admin', 'management'])
    )
  );

-- ========================================
-- PROJECT ACTIVITY LOG POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can create activity logs" ON public.project_activity_log;

CREATE POLICY "Users can create activity logs"
  ON public.project_activity_log FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ========================================
-- PLATFORM ADMINS POLICIES
-- ========================================
DROP POLICY IF EXISTS "Platform admins can view own record" ON public.platform_admins;

CREATE POLICY "Platform admins can view own record"
  ON public.platform_admins FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

-- ========================================
-- APP USERS POLICIES
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.app_users;

CREATE POLICY "Authenticated users can update own profile"
  ON public.app_users FOR UPDATE
  TO authenticated
  USING (auth_user_id = (select auth.uid()))
  WITH CHECK (auth_user_id = (select auth.uid()));

-- ========================================
-- ORGANIZATIONS POLICIES
-- ========================================
DROP POLICY IF EXISTS "Organization owners can update their organization" ON public.organizations;

CREATE POLICY "Organization owners can update their organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND is_organization_owner = true
    )
  );

-- ========================================
-- PROJECT MESSAGES POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can send project messages" ON public.project_messages;
DROP POLICY IF EXISTS "Sales reps can view project messages" ON public.project_messages;
DROP POLICY IF EXISTS "Sales reps can send project messages" ON public.project_messages;

CREATE POLICY "Users can send project messages"
  ON public.project_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Sales reps can view project messages"
  ON public.project_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );

CREATE POLICY "Sales reps can send project messages"
  ON public.project_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );

-- ========================================
-- CUSTOMERS POLICIES
-- ========================================
DROP POLICY IF EXISTS "Sales reps can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Sales reps can update customers" ON public.customers;
DROP POLICY IF EXISTS "Sales reps can create customers" ON public.customers;

CREATE POLICY "Sales reps can view all customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );

CREATE POLICY "Sales reps can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );

CREATE POLICY "Sales reps can create customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );

-- ========================================
-- DOCUMENTS POLICIES
-- ========================================
DROP POLICY IF EXISTS "Sales reps can view documents" ON public.documents;
DROP POLICY IF EXISTS "Sales reps can upload documents" ON public.documents;

CREATE POLICY "Sales reps can view documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );

CREATE POLICY "Sales reps can upload documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );

-- ========================================
-- PROJECT TIMELINE POLICIES
-- ========================================
DROP POLICY IF EXISTS "Sales reps can view project timeline" ON public.project_timeline;

CREATE POLICY "Sales reps can view project timeline"
  ON public.project_timeline FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );

-- ========================================
-- SCHEDULING POLICIES
-- ========================================
DROP POLICY IF EXISTS "Sales reps can schedule site surveys" ON public.scheduling;
DROP POLICY IF EXISTS "Sales reps can view scheduling" ON public.scheduling;

CREATE POLICY "Sales reps can schedule site surveys"
  ON public.scheduling FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );

CREATE POLICY "Sales reps can view scheduling"
  ON public.scheduling FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );

-- ========================================
-- CUSTOM ADDERS POLICIES
-- ========================================
DROP POLICY IF EXISTS "Sales reps can view custom adders" ON public.custom_adders;

CREATE POLICY "Sales reps can view custom adders"
  ON public.custom_adders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('sales_rep', 'sales_manager', 'admin')
    )
  );

-- ========================================
-- SALES COMMISSIONS POLICIES
-- ========================================
DROP POLICY IF EXISTS "Sales reps can view own commissions" ON public.sales_commissions;
DROP POLICY IF EXISTS "Sales managers can view team commissions" ON public.sales_commissions;
DROP POLICY IF EXISTS "Admins can view all commissions" ON public.sales_commissions;
DROP POLICY IF EXISTS "Admins and managers can insert commissions" ON public.sales_commissions;
DROP POLICY IF EXISTS "Admins and managers can update commissions" ON public.sales_commissions;
DROP POLICY IF EXISTS "Employees can view all commissions" ON public.sales_commissions;

CREATE POLICY "Sales reps can view own commissions"
  ON public.sales_commissions FOR SELECT
  TO authenticated
  USING (sales_rep_id = (select auth.uid()));

CREATE POLICY "Sales managers can view team commissions"
  ON public.sales_commissions FOR SELECT
  TO authenticated
  USING (sales_manager_id = (select auth.uid()));

CREATE POLICY "Admins can view all commissions"
  ON public.sales_commissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins and managers can insert commissions"
  ON public.sales_commissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('admin', 'sales_manager')
    )
  );

CREATE POLICY "Admins and managers can update commissions"
  ON public.sales_commissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('admin', 'sales_manager')
    )
  );

CREATE POLICY "Employees can view all commissions"
  ON public.sales_commissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = (select auth.uid())
    )
  );
