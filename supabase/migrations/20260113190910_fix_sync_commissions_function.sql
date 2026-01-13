/*
  # Fix sync_existing_commissions Function

  1. Purpose
    - Fix the sync_existing_commissions function to use correct column names from project_timeline
    - The function was referencing old column names that don't exist
    
  2. Changes
    - Update function to use site_survey_status and installation_status (status fields)
    - Update function to use site_survey_completed_date and installation_completed_date (date fields)
*/

-- Fix the sync function to use correct column names
CREATE OR REPLACE FUNCTION sync_existing_commissions()
RETURNS void AS $$
BEGIN
  -- Update site survey completions
  UPDATE sales_commissions sc
  SET 
    site_survey_complete_date = CURRENT_DATE,
    m1_eligibility_date = sc.signature_date + INTERVAL '3 days',
    m1_payment_status = CASE
      WHEN sc.signature_date + INTERVAL '3 days' <= CURRENT_DATE THEN 'eligible'
      ELSE 'pending'
    END,
    m1_payroll_period_end = CASE
      WHEN sc.signature_date + INTERVAL '3 days' <= CURRENT_DATE 
      THEN get_payroll_period_end(CURRENT_DATE)
      ELSE get_payroll_period_end((sc.signature_date + INTERVAL '3 days')::DATE)
    END
  FROM project_timeline pt
  WHERE sc.customer_id = pt.customer_id
    AND pt.site_survey_status = 'completed'
    AND sc.site_survey_complete_date IS NULL
    AND sc.m1_payment_status = 'pending';

  -- Update installation completions
  UPDATE sales_commissions sc
  SET 
    install_complete_date = CURRENT_DATE,
    m2_payment_status = 'eligible',
    m2_payroll_period_end = get_payroll_period_end(CURRENT_DATE)
  FROM project_timeline pt
  WHERE sc.customer_id = pt.customer_id
    AND pt.installation_status = 'completed'
    AND sc.install_complete_date IS NULL
    AND sc.m2_payment_status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
