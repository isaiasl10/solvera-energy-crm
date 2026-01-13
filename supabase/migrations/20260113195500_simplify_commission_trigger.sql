/*
  # Simplify Commission Trigger

  1. Changes
    - Replace complex milestone tracking trigger with simpler version
    - Only track what the sales_commissions table actually supports:
      - site_survey_complete_date
      - install_complete_date
    - Remove references to columns that don't exist
    
  2. Security
    - Maintains SECURITY DEFINER for proper commission updates
*/

-- Replace the overly complex trigger with a simpler version
CREATE OR REPLACE FUNCTION public.update_commission_milestones()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Update site survey completion
    IF (OLD.site_survey_status IS DISTINCT FROM 'completed' AND NEW.site_survey_status = 'completed') THEN
      UPDATE public.sales_commissions
      SET 
        site_survey_complete_date = CURRENT_DATE,
        m1_eligibility_date = signature_date + INTERVAL '3 days',
        m1_payment_status = CASE
          WHEN signature_date + INTERVAL '3 days' <= CURRENT_DATE THEN 'eligible'
          ELSE 'pending'
        END
      WHERE customer_id = NEW.customer_id
      AND site_survey_complete_date IS NULL
      AND m1_payment_status = 'pending';
    END IF;

    -- Update installation completion
    IF (OLD.installation_status IS DISTINCT FROM 'completed' AND NEW.installation_status = 'completed') THEN
      UPDATE public.sales_commissions
      SET 
        install_complete_date = CURRENT_DATE,
        m2_payment_status = 'eligible'
      WHERE customer_id = NEW.customer_id
      AND install_complete_date IS NULL
      AND m2_payment_status = 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
