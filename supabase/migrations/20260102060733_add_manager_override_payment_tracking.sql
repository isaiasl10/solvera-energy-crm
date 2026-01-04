/*
  # Add Manager Override Payment Tracking

  1. Changes
    - Add manager override payment status tracking fields
    - Add manager override eligibility date (when installation is scheduled)
    - Add manager override paid date
    - Add manager override payroll period end date
    - Create trigger to mark manager override as eligible when installation is scheduled

  2. Logic
    - Manager override becomes eligible when installation is scheduled
    - Manager override is assigned to the payroll period when it becomes eligible
*/

-- Add manager override payment tracking fields
ALTER TABLE sales_commissions
ADD COLUMN IF NOT EXISTS manager_override_payment_status text DEFAULT 'pending' CHECK (manager_override_payment_status IN ('pending', 'eligible', 'paid')),
ADD COLUMN IF NOT EXISTS manager_override_eligibility_date date,
ADD COLUMN IF NOT EXISTS manager_override_paid_date date,
ADD COLUMN IF NOT EXISTS manager_override_payroll_period_end date;

-- Function to handle manager override eligibility when installation is scheduled
CREATE OR REPLACE FUNCTION update_manager_override_eligibility()
RETURNS TRIGGER AS $$
BEGIN
  -- When installation is scheduled, mark manager override as eligible
  IF NEW.installation_status = 'scheduled' AND (OLD.installation_status IS NULL OR OLD.installation_status != 'scheduled') THEN
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

-- Create trigger for installation scheduling
DROP TRIGGER IF EXISTS trigger_update_manager_override_eligibility ON project_timeline;
CREATE TRIGGER trigger_update_manager_override_eligibility
  AFTER UPDATE ON project_timeline
  FOR EACH ROW
  EXECUTE FUNCTION update_manager_override_eligibility();

-- Update existing records where installation is already scheduled
UPDATE sales_commissions sc
SET 
  manager_override_payment_status = 'eligible',
  manager_override_eligibility_date = CURRENT_DATE,
  manager_override_payroll_period_end = get_payroll_period_end(CURRENT_DATE)
FROM project_timeline pt
WHERE sc.customer_id = pt.customer_id
  AND pt.installation_status = 'scheduled'
  AND sc.sales_manager_override_amount IS NOT NULL
  AND sc.sales_manager_override_amount > 0
  AND sc.manager_override_payment_status = 'pending';
