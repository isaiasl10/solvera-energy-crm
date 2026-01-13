/*
  # Add Customer ID to Time Clock

  1. Changes
    - Add customer_id to time_clock table
    - This links time entries to specific customer jobs
    - Allows tracking labor costs per customer

  2. Notes
    - customer_id is optional (nullable) to support general admin time
    - When workers clock in for a specific job, customer_id should be set
*/

-- Add customer_id to time_clock
ALTER TABLE time_clock
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_time_clock_customer_id ON time_clock(customer_id);
