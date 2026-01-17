/*
  # Fix Function Search Paths for Security

  1. Security Improvements
    - Set secure search_path for all functions
    - Prevents search_path injection attacks

  2. Functions Updated
    - All trigger functions
    - All calculation functions
    - All utility functions
*/

-- Fix search paths for all functions
ALTER FUNCTION public.calculate_detach_reset_financials() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_timeline_from_scheduling() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_payroll_period_end(date) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_invoice_number() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_contractors_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_existing_commissions() SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_subcontract_revenue() SET search_path = public, pg_temp;
ALTER FUNCTION public.customers_normalize_columns() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_employee_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.app_users_set_employee_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_current_app_user_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_create_sales_commission() SET search_path = public, pg_temp;
