/*
  # Update Manager Override Trigger for Completed Installations

  1. Changes
    - Update the manager override eligibility trigger to also handle completed installations
    - Manager override should be eligible when installation is scheduled OR completed

  2. Logic
    - Check for both 'scheduled' and 'completed' installation status
*/

-- Update the function to handle both scheduled and completed installations
CREATE OR REPLACE FUNCTION update_manager_override_eligibility()
RETURNS TRIGGER AS $$
BEGIN
  -- When installation is scheduled or completed, mark manager override as eligible
  IF (NEW.installation_status IN ('scheduled', 'completed')) AND 
     (OLD.installation_status IS NULL OR OLD.installation_status NOT IN ('scheduled', 'completed')) THEN
    UPDATE sales_commissions
    SET 
      manager_override_payment_status = CASE
        WHEN sales_manager_override_amount IS NOT NULL AND sales_manager_override_amount > 0 THEN 'eligible'
        ELSE manager_override_payment_status
      END,
      manager_override_eligibility_date = CASE
        WHEN sales_manager_override_amount IS NOT NULL AND sales_manager_override_amount > 0 THEN CURRENT_DATE
        ELSE manager_override_eligibility_date
      END,
      manager_override_payroll_period_end = CASE
        WHEN sales_manager_override_amount IS NOT NULL AND sales_manager_override_amount > 0 THEN get_payroll_period_end(CURRENT_DATE)
        ELSE manager_override_payroll_period_end
      END
    WHERE customer_id = NEW.customer_id
    AND manager_override_payment_status = 'pending'
    AND sales_manager_override_amount IS NOT NULL
    AND sales_manager_override_amount > 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing records where installation is scheduled or completed
UPDATE sales_commissions sc
SET 
  manager_override_payment_status = 'eligible',
  manager_override_eligibility_date = CURRENT_DATE,
  manager_override_payroll_period_end = get_payroll_period_end(CURRENT_DATE)
FROM project_timeline pt
WHERE sc.customer_id = pt.customer_id
  AND pt.installation_status IN ('scheduled', 'completed')
  AND sc.sales_manager_override_amount IS NOT NULL
  AND sc.sales_manager_override_amount > 0
  AND sc.manager_override_payment_status = 'pending';
