/*
  # Auto-assign Eligible Commissions to Payroll Period

  1. Changes
    - Update commission auto-update function to assign payroll periods when payments become eligible
    - M1 payments are assigned to the payroll period that includes the eligibility date
    - M2 payments are assigned to the payroll period that includes the install completion date
  
  2. Logic
    - Pay periods are bi-weekly starting from 2024-12-14
    - Each period is 14 days long
    - Commissions become part of the payroll period that includes their eligibility date
*/

-- Function to calculate which payroll period a date falls into
CREATE OR REPLACE FUNCTION get_payroll_period_end(target_date DATE)
RETURNS DATE AS $$
DECLARE
  reference_date DATE := '2024-12-14';
  days_diff INTEGER;
  periods_since INTEGER;
  period_start DATE;
  period_end DATE;
BEGIN
  days_diff := target_date - reference_date;
  periods_since := FLOOR(days_diff::numeric / 14);
  period_start := reference_date + (periods_since * 14);
  period_end := period_start + 13;
  RETURN period_end;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the commission milestone function to assign payroll periods
CREATE OR REPLACE FUNCTION update_commission_milestones()
RETURNS TRIGGER AS $$
BEGIN
  -- Update site survey completion
  IF NEW.site_survey_status = 'completed' AND (OLD.site_survey_status IS NULL OR OLD.site_survey_status != 'completed') THEN
    UPDATE sales_commissions
    SET 
      site_survey_complete_date = CURRENT_DATE,
      m1_eligibility_date = signature_date + INTERVAL '3 days',
      m1_payment_status = CASE
        WHEN signature_date + INTERVAL '3 days' <= CURRENT_DATE THEN 'eligible'
        ELSE 'pending'
      END,
      m1_payroll_period_end = CASE
        WHEN signature_date + INTERVAL '3 days' <= CURRENT_DATE 
        THEN get_payroll_period_end(CURRENT_DATE)
        ELSE get_payroll_period_end((signature_date + INTERVAL '3 days')::DATE)
      END
    WHERE customer_id = NEW.customer_id
    AND m1_payment_status = 'pending';
  END IF;

  -- Update installation completion
  IF NEW.installation_status = 'completed' AND (OLD.installation_status IS NULL OR OLD.installation_status != 'completed') THEN
    UPDATE sales_commissions
    SET 
      install_complete_date = CURRENT_DATE,
      m2_payment_status = 'eligible',
      m2_payroll_period_end = get_payroll_period_end(CURRENT_DATE)
    WHERE customer_id = NEW.customer_id
    AND m2_payment_status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-run sync for existing commissions
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

-- Run the sync function to update existing records
SELECT sync_existing_commissions();
