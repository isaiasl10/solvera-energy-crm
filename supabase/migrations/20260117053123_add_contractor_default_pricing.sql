/*
  # Add Contractor Default Pricing Fields

  1. Changes to contractors table
    - Add `default_new_install_ppw` (price per watt for new installs)
    - Add `default_service_rate` (hourly/flat rate for service jobs)
    - Note: default_detach_reset_price_per_panel already exists from previous migration
    
  2. Important Notes
    - These defaults are used when creating new subcontract jobs
    - Can be overridden on a per-job basis in subcontract_jobs table
    - Helps streamline job creation with contractor-specific pricing
    
  3. Security
    - No RLS changes (per approval conditions)
*/

-- Add default pricing fields for new install jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractors' AND column_name = 'default_new_install_ppw'
  ) THEN
    ALTER TABLE contractors ADD COLUMN default_new_install_ppw numeric;
  END IF;
END $$;

-- Add default service rate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contractors' AND column_name = 'default_service_rate'
  ) THEN
    ALTER TABLE contractors ADD COLUMN default_service_rate numeric;
  END IF;
END $$;

-- Add comments documenting the pricing fields
COMMENT ON COLUMN contractors.default_new_install_ppw IS 'Default price per watt for new install subcontract jobs';
COMMENT ON COLUMN contractors.default_service_rate IS 'Default rate for service subcontract jobs';
COMMENT ON COLUMN contractors.default_detach_reset_price_per_panel IS 'Default price per panel for detach/reset subcontract jobs';