/*
  # Fix Function Search Path Security Issues
  
  1. Security Improvements
    - Set explicit search_path on all functions to prevent SQL injection
    - This ensures functions always reference the correct schema
  
  2. Functions Affected
    - update_sales_commissions_updated_at
    - get_payroll_period_end
    - update_commission_milestones
    - sync_existing_commissions
    - update_manager_override_eligibility
    - create_admin
    - update_updated_at_column
    - set_customer_id
    - generate_customer_id
    - update_app_users_updated_at
  
  3. Changes
    - Add "SET search_path = public, pg_temp" to all function definitions
    - Maintains same functionality with improved security
*/

-- Update function: update_sales_commissions_updated_at
CREATE OR REPLACE FUNCTION public.update_sales_commissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update function: get_payroll_period_end
CREATE OR REPLACE FUNCTION public.get_payroll_period_end(period_start timestamptz)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN period_start + interval '13 days' + interval '23 hours 59 minutes 59 seconds';
END;
$$;

-- Update function: update_commission_milestones
CREATE OR REPLACE FUNCTION public.update_commission_milestones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.site_survey_completed_date IS NULL AND NEW.site_survey_completed_date IS NOT NULL) THEN
      UPDATE public.sales_commissions
      SET site_survey_completed = true
      WHERE customer_id = NEW.customer_id;
    END IF;

    IF (OLD.design_completed_date IS NULL AND NEW.design_completed_date IS NOT NULL) THEN
      UPDATE public.sales_commissions
      SET design_completed = true
      WHERE customer_id = NEW.customer_id;
    END IF;

    IF (OLD.permit_submitted_date IS NULL AND NEW.permit_submitted_date IS NOT NULL) THEN
      UPDATE public.sales_commissions
      SET permit_submitted = true
      WHERE customer_id = NEW.customer_id;
    END IF;

    IF (OLD.permit_approved_date IS NULL AND NEW.permit_approved_date IS NOT NULL) THEN
      UPDATE public.sales_commissions
      SET permit_approved = true
      WHERE customer_id = NEW.customer_id;
    END IF;

    IF (OLD.installation_completed_date IS NULL AND NEW.installation_completed_date IS NOT NULL) THEN
      UPDATE public.sales_commissions
      SET installation_completed = true,
          manager_override_eligible = true
      WHERE customer_id = NEW.customer_id;
    END IF;

    IF (OLD.inspection_passed_date IS NULL AND NEW.inspection_passed_date IS NOT NULL) THEN
      UPDATE public.sales_commissions
      SET inspection_passed = true
      WHERE customer_id = NEW.customer_id;
    END IF;

    IF (OLD.pto_received_date IS NULL AND NEW.pto_received_date IS NOT NULL) THEN
      UPDATE public.sales_commissions
      SET pto_received = true
      WHERE customer_id = NEW.customer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Update function: sync_existing_commissions
CREATE OR REPLACE FUNCTION public.sync_existing_commissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.sales_commissions sc
  SET
    site_survey_completed = (pt.site_survey_completed_date IS NOT NULL),
    design_completed = (pt.design_completed_date IS NOT NULL),
    permit_submitted = (pt.permit_submitted_date IS NOT NULL),
    permit_approved = (pt.permit_approved_date IS NOT NULL),
    installation_completed = (pt.installation_completed_date IS NOT NULL),
    inspection_passed = (pt.inspection_passed_date IS NOT NULL),
    pto_received = (pt.pto_received_date IS NOT NULL),
    manager_override_eligible = (pt.installation_completed_date IS NOT NULL)
  FROM public.project_timeline pt
  WHERE sc.customer_id = pt.customer_id;
END;
$$;

-- Update function: update_manager_override_eligibility
CREATE OR REPLACE FUNCTION public.update_manager_override_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (OLD.installation_completed_date IS NULL AND NEW.installation_completed_date IS NOT NULL) THEN
    UPDATE public.sales_commissions
    SET manager_override_eligible = true
    WHERE customer_id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Update function: create_admin
CREATE OR REPLACE FUNCTION public.create_admin(
  admin_email text,
  admin_password text,
  admin_full_name text,
  org_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_user_id uuid;
  new_app_user_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    now(),
    jsonb_build_object('role', 'admin'),
    jsonb_build_object('full_name', admin_full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  INSERT INTO public.app_users (
    id,
    auth_user_id,
    email,
    full_name,
    role,
    role_category,
    organization_id,
    is_organization_owner,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    admin_email,
    admin_full_name,
    'admin',
    'admin',
    org_id,
    true,
    now(),
    now()
  )
  RETURNING id INTO new_app_user_id;

  RETURN new_app_user_id;
END;
$$;

-- Update function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update function: set_customer_id
CREATE OR REPLACE FUNCTION public.set_customer_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN
    NEW.customer_id := generate_customer_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Update function: generate_customer_id
CREATE OR REPLACE FUNCTION public.generate_customer_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    new_id := 'CUST-' || LPAD(floor(random() * 1000000)::TEXT, 6, '0');
    
    SELECT EXISTS(SELECT 1 FROM public.customers WHERE customer_id = new_id) INTO id_exists;
    
    IF NOT id_exists THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$;

-- Update function: update_app_users_updated_at
CREATE OR REPLACE FUNCTION public.update_app_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
