/*
  # Add Manager Override Calculation to Commission System

  1. Problem
    - Commission records are being created without calculating sales_manager_override_amount
    - Sales managers cannot see their override earnings because the field is NULL
    
  2. Changes
    - Update auto_create_sales_commission() function to calculate manager override amount
    - Formula: (Sales Rep PPW Redline - Manager PPW Redline) × System Size in Watts
    - Backfill existing commission records with correct override amounts
    
  3. Logic
    - Only calculate override if both rep and manager have ppw_redline set
    - Override can be negative if rep's redline is lower than manager's (unusual but possible)
    - System size is converted from kW to watts (multiply by 1000)
*/

-- Update the auto_create_sales_commission function to include manager override calculation
CREATE OR REPLACE FUNCTION auto_create_sales_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_sales_rep_record RECORD;
  v_manager_record RECORD;
  v_total_commission DECIMAL(10,2);
  v_system_size_watts DECIMAL(10,2);
  v_actual_ppw DECIMAL(10,4);
  v_m1_amount DECIMAL(10,2);
  v_m2_amount DECIMAL(10,2);
  v_manager_override DECIMAL(10,2);
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
    
    -- Calculate manager override if there is a manager
    v_manager_override := NULL;
    IF v_sales_rep_record.reporting_manager_id IS NOT NULL THEN
      -- Get manager's PPW redline
      SELECT ppw_redline INTO v_manager_record
      FROM app_users
      WHERE id = v_sales_rep_record.reporting_manager_id;
      
      -- Calculate override: (Rep PPW - Manager PPW) × System Size
      IF v_sales_rep_record.ppw_redline IS NOT NULL 
         AND v_manager_record.ppw_redline IS NOT NULL
         AND v_sales_rep_record.ppw_redline > 0 
         AND v_manager_record.ppw_redline > 0 THEN
        v_manager_override := (v_sales_rep_record.ppw_redline - v_manager_record.ppw_redline) * v_system_size_watts;
      END IF;
    END IF;
    
    -- Upsert commission record
    INSERT INTO sales_commissions (
      customer_id,
      sales_rep_id,
      sales_manager_id,
      total_commission,
      sales_manager_override_amount,
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
      v_manager_override,
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
      sales_manager_override_amount = EXCLUDED.sales_manager_override_amount,
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

-- Backfill existing commission records with manager override amounts
UPDATE sales_commissions sc
SET 
  sales_manager_override_amount = (
    SELECT 
      (rep.ppw_redline - mgr.ppw_redline) * (c.system_size_kw * 1000)
    FROM customers c
    INNER JOIN app_users rep ON c.sales_rep_id = rep.id
    INNER JOIN app_users mgr ON rep.reporting_manager_id = mgr.id
    WHERE c.id = sc.customer_id
      AND rep.ppw_redline IS NOT NULL
      AND rep.ppw_redline > 0
      AND mgr.ppw_redline IS NOT NULL
      AND mgr.ppw_redline > 0
  ),
  updated_at = NOW()
WHERE sales_manager_override_amount IS NULL
  AND sales_manager_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM customers c
    INNER JOIN app_users rep ON c.sales_rep_id = rep.id
    INNER JOIN app_users mgr ON rep.reporting_manager_id = mgr.id
    WHERE c.id = sc.customer_id
      AND rep.ppw_redline IS NOT NULL
      AND mgr.ppw_redline IS NOT NULL
  );
