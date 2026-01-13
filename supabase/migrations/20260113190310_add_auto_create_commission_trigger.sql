/*
  # Auto-Create Commission Records

  1. Purpose
    - Automatically create commission records when a customer is created or updated with:
      - sales_rep_id
      - signature_date
      - contract_price
      - system_size_kw
    
  2. Commission Calculation
    - Calculate total commission based on sales rep's commission structure:
      - If ppw_redline is set: ((contract_price / (system_size_kw * 1000)) - ppw_redline) * (system_size_kw * 1000)
      - If per_watt_rate is set: per_watt_rate * (system_size_kw * 1000)
    - M1 payment: $1000
    - M2 payment: total_commission - $1000
    - Set sales_manager_id from sales rep's reporting_manager_id
    
  3. Trigger Logic
    - Runs AFTER INSERT or UPDATE on customers table
    - Only creates commission if all required fields are present
    - Uses UPSERT to avoid duplicates (unique constraint on customer_id)
*/

-- Function to auto-create commission records
CREATE OR REPLACE FUNCTION auto_create_sales_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_sales_rep_record RECORD;
  v_total_commission DECIMAL(10,2);
  v_system_size_watts DECIMAL(10,2);
  v_actual_ppw DECIMAL(10,4);
  v_m1_amount DECIMAL(10,2);
  v_m2_amount DECIMAL(10,2);
BEGIN
  -- Only proceed if we have all required fields
  IF NEW.sales_rep_id IS NOT NULL 
     AND NEW.signature_date IS NOT NULL 
     AND NEW.contract_price IS NOT NULL 
     AND NEW.system_size_kw IS NOT NULL 
     AND NEW.system_size_kw > 0 THEN
    
    -- Get sales rep details
    SELECT 
      id,
      per_watt_rate,
      ppw_redline,
      reporting_manager_id
    INTO v_sales_rep_record
    FROM app_users
    WHERE id = NEW.sales_rep_id;
    
    -- Calculate system size in watts
    v_system_size_watts := NEW.system_size_kw * 1000;
    
    -- Calculate actual PPW from contract
    v_actual_ppw := NEW.contract_price / v_system_size_watts;
    
    -- Calculate total commission
    IF v_sales_rep_record.ppw_redline IS NOT NULL AND v_sales_rep_record.ppw_redline > 0 THEN
      -- Commission based on margin above redline
      v_total_commission := (v_actual_ppw - v_sales_rep_record.ppw_redline) * v_system_size_watts;
    ELSIF v_sales_rep_record.per_watt_rate IS NOT NULL AND v_sales_rep_record.per_watt_rate > 0 THEN
      -- Commission based on per-watt rate
      v_total_commission := v_sales_rep_record.per_watt_rate * v_system_size_watts;
    ELSE
      -- No commission structure set, default to 0
      v_total_commission := 0;
    END IF;
    
    -- Ensure commission is not negative
    IF v_total_commission < 0 THEN
      v_total_commission := 0;
    END IF;
    
    -- Set milestone amounts
    v_m1_amount := 1000;
    v_m2_amount := GREATEST(v_total_commission - 1000, 0);
    
    -- Upsert commission record
    INSERT INTO sales_commissions (
      customer_id,
      sales_rep_id,
      sales_manager_id,
      total_commission,
      m1_payment_amount,
      m2_payment_amount,
      signature_date,
      m1_eligibility_date,
      m1_payment_status,
      m2_payment_status,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.sales_rep_id,
      v_sales_rep_record.reporting_manager_id,
      v_total_commission,
      v_m1_amount,
      v_m2_amount,
      NEW.signature_date,
      NEW.signature_date + INTERVAL '3 days',
      CASE 
        WHEN NEW.signature_date + INTERVAL '3 days' <= CURRENT_DATE THEN 'eligible'
        ELSE 'pending'
      END,
      'pending',
      NOW(),
      NOW()
    )
    ON CONFLICT (customer_id) 
    DO UPDATE SET
      sales_rep_id = EXCLUDED.sales_rep_id,
      sales_manager_id = EXCLUDED.sales_manager_id,
      total_commission = EXCLUDED.total_commission,
      m1_payment_amount = EXCLUDED.m1_payment_amount,
      m2_payment_amount = EXCLUDED.m2_payment_amount,
      signature_date = EXCLUDED.signature_date,
      m1_eligibility_date = EXCLUDED.m1_eligibility_date,
      m1_payment_status = CASE
        WHEN sales_commissions.m1_payment_status = 'paid' THEN 'paid'
        ELSE EXCLUDED.m1_payment_status
      END,
      updated_at = NOW();
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating commissions
DROP TRIGGER IF EXISTS trigger_auto_create_sales_commission ON customers;
CREATE TRIGGER trigger_auto_create_sales_commission
  AFTER INSERT OR UPDATE OF sales_rep_id, signature_date, contract_price, system_size_kw
  ON customers
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_sales_commission();

-- Backfill existing customers with sales rep and signature date
INSERT INTO sales_commissions (
  customer_id,
  sales_rep_id,
  sales_manager_id,
  total_commission,
  m1_payment_amount,
  m2_payment_amount,
  signature_date,
  m1_eligibility_date,
  m1_payment_status,
  m2_payment_status,
  created_at,
  updated_at
)
SELECT 
  c.id as customer_id,
  c.sales_rep_id,
  u.reporting_manager_id as sales_manager_id,
  CASE
    WHEN u.ppw_redline IS NOT NULL AND u.ppw_redline > 0 THEN
      GREATEST(((c.contract_price / (c.system_size_kw * 1000)) - u.ppw_redline) * (c.system_size_kw * 1000), 0)
    WHEN u.per_watt_rate IS NOT NULL AND u.per_watt_rate > 0 THEN
      u.per_watt_rate * (c.system_size_kw * 1000)
    ELSE 0
  END as total_commission,
  1000 as m1_payment_amount,
  GREATEST(
    CASE
      WHEN u.ppw_redline IS NOT NULL AND u.ppw_redline > 0 THEN
        GREATEST(((c.contract_price / (c.system_size_kw * 1000)) - u.ppw_redline) * (c.system_size_kw * 1000), 0)
      WHEN u.per_watt_rate IS NOT NULL AND u.per_watt_rate > 0 THEN
        u.per_watt_rate * (c.system_size_kw * 1000)
      ELSE 0
    END - 1000,
    0
  ) as m2_payment_amount,
  c.signature_date,
  c.signature_date + INTERVAL '3 days' as m1_eligibility_date,
  CASE 
    WHEN c.signature_date + INTERVAL '3 days' <= CURRENT_DATE THEN 'eligible'
    ELSE 'pending'
  END as m1_payment_status,
  'pending' as m2_payment_status,
  NOW() as created_at,
  NOW() as updated_at
FROM customers c
INNER JOIN app_users u ON c.sales_rep_id = u.id
WHERE c.sales_rep_id IS NOT NULL
  AND c.signature_date IS NOT NULL
  AND c.contract_price IS NOT NULL
  AND c.system_size_kw IS NOT NULL
  AND c.system_size_kw > 0
  AND NOT EXISTS (
    SELECT 1 FROM sales_commissions sc WHERE sc.customer_id = c.id
  );
