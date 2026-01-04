/*
  # Auto-update Commission Status Based on Project Timeline

  1. Changes
    - Create function to automatically update commission milestones when project timeline changes
    - Create trigger to call the function when project_timeline is updated
    - Create function to sync existing commission records with current timeline status
    - Update eligibility logic for M1 (site survey complete + 3 days from signature)
    - Update eligibility logic for M2 (installation complete)
  
  2. Security
    - Function runs with security definer privileges to bypass RLS
*/

-- Function to update commission milestones based on project timeline
CREATE OR REPLACE FUNCTION update_commission_milestones()
RETURNS TRIGGER AS $$
BEGIN
  -- Update site survey completion
  IF NEW.site_survey_status = 'completed' AND OLD.site_survey_status != 'completed' THEN
    UPDATE sales_commissions
    SET 
      site_survey_complete_date = CURRENT_DATE,
      m1_eligibility_date = (
        SELECT signature_date + INTERVAL '3 days'
        FROM sales_commissions
        WHERE customer_id = NEW.customer_id
      ),
      m1_payment_status = CASE
        WHEN (
          SELECT signature_date + INTERVAL '3 days' <= CURRENT_DATE
          FROM sales_commissions
          WHERE customer_id = NEW.customer_id
        ) THEN 'eligible'
        ELSE 'pending'
      END
    WHERE customer_id = NEW.customer_id
    AND m1_payment_status = 'pending';
  END IF;

  -- Update installation completion
  IF NEW.installation_status = 'completed' AND OLD.installation_status != 'completed' THEN
    UPDATE sales_commissions
    SET 
      install_complete_date = CURRENT_DATE,
      m2_payment_status = 'eligible'
    WHERE customer_id = NEW.customer_id
    AND m2_payment_status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for project_timeline updates
DROP TRIGGER IF EXISTS trigger_update_commission_milestones ON project_timeline;
CREATE TRIGGER trigger_update_commission_milestones
  AFTER UPDATE ON project_timeline
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_milestones();

-- Function to sync existing commission records with current timeline status
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
    m2_payment_status = 'eligible'
  FROM project_timeline pt
  WHERE sc.customer_id = pt.customer_id
    AND pt.installation_status = 'completed'
    AND sc.install_complete_date IS NULL
    AND sc.m2_payment_status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function to update existing records
SELECT sync_existing_commissions();
