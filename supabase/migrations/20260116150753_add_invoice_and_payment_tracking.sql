/*
  # Add Invoice and Payment Tracking to Subcontracting Jobs

  1. Changes
    - Add invoice_sent_date to track when invoice was sent
    - Add invoice_paid_date to track when invoice was paid
    - Add payment_type to track payment method (CHECK, ACH, WIRE)
    - Add check_number for when payment_type is CHECK

  2. Notes
    - These fields are specifically for subcontracting jobs
    - payment_type is optional and only required when invoice is paid
    - check_number is only required when payment_type is CHECK
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'invoice_sent_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN invoice_sent_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'invoice_paid_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN invoice_paid_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN payment_type text CHECK (payment_type IN ('CHECK', 'ACH', 'WIRE'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'check_number'
  ) THEN
    ALTER TABLE customers ADD COLUMN check_number text;
  END IF;
END $$;
