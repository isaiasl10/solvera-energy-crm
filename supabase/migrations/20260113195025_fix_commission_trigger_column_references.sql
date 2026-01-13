/*
  # Fix Commission Trigger Column References

  1. Changes
    - Update the update_commission_milestones() function to reference correct column names
    - Map to actual project_timeline columns:
      - design_completed_date → engineering_plans_received_date
      - permit_submitted_date → city_permits_submitted_date  
      - permit_approved_date → city_permits_approved_date
      - inspection_passed_date → (check inspection_status = 'passed')
      - pto_received_date → pto_approved_date
    
  2. Security
    - Maintains SECURITY DEFINER for proper commission updates
*/

CREATE OR REPLACE FUNCTION public.update_commission_milestones()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.site_survey_completed_date IS NULL AND NEW.site_survey_completed_date IS NOT NULL) THEN
      UPDATE public.sales_commissions
      SET site_survey_completed = true
      WHERE customer_id = NEW.customer_id;
    END IF;

    IF (OLD.engineering_plans_received_date IS NULL AND NEW.engineering_plans_received_date IS NOT NULL) THEN
      UPDATE public.sales_commissions
      SET design_completed = true
      WHERE customer_id = NEW.customer_id;
    END IF;

    IF (OLD.city_permits_submitted_date IS NULL AND NEW.city_permits_submitted_date IS NOT NULL) THEN
      UPDATE public.sales_commissions
      SET permit_submitted = true
      WHERE customer_id = NEW.customer_id;
    END IF;

    IF (OLD.city_permits_approved_date IS NULL AND NEW.city_permits_approved_date IS NOT NULL) THEN
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

    IF (OLD.inspection_status IS DISTINCT FROM 'passed' AND NEW.inspection_status = 'passed') THEN
      UPDATE public.sales_commissions
      SET inspection_passed = true
      WHERE customer_id = NEW.customer_id;
    END IF;

    IF (OLD.pto_approved_date IS NULL AND NEW.pto_approved_date IS NOT NULL) THEN
      UPDATE public.sales_commissions
      SET pto_received = true
      WHERE customer_id = NEW.customer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
