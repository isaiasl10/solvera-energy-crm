/*
  # Add Customer ID Field

  1. Schema Changes
    - Add `customer_id` column to `customers` table (unique, auto-generated)
    - Create sequence for customer ID numbering starting at 1001
    - Create function to auto-generate customer IDs in format "CUST-####"
    - Create trigger to populate customer_id on insert

  2. Details
    - Customer IDs follow format: CUST-1001, CUST-1002, etc.
    - Automatically generated when customer is created
    - Unique and indexed for fast lookups
    - Starts at 1001 for professional appearance

  3. Backfill
    - Update existing customers with auto-generated IDs
*/

-- Create sequence for customer numbers
CREATE SEQUENCE IF NOT EXISTS customer_id_seq START WITH 1001;

-- Add customer_id column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_id text UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);

-- Create function to generate customer ID
CREATE OR REPLACE FUNCTION generate_customer_id()
RETURNS text AS $$
BEGIN
  RETURN 'CUST-' || LPAD(nextval('customer_id_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate customer_id on insert
CREATE OR REPLACE FUNCTION set_customer_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN
    NEW.customer_id := generate_customer_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_customer_id ON customers;
CREATE TRIGGER trigger_set_customer_id
BEFORE INSERT ON customers
FOR EACH ROW
EXECUTE FUNCTION set_customer_id();

-- Backfill existing customers with IDs
UPDATE customers
SET customer_id = generate_customer_id()
WHERE customer_id IS NULL;