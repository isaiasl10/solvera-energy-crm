/*
  # Add is_active Column for Soft Deletes

  1. Changes
    - Add `is_active` boolean column to `customers` table (default true)
    - Add `is_active` boolean column to `scheduling` table (default true)
    - Create indexes on is_active columns for better query performance
    
  2. Purpose
    - Enable soft delete functionality for customer projects
    - Maintain data history while hiding deleted records
    - Allow filtering of active vs inactive records
    
  3. Notes
    - All existing records will default to `is_active = true`
    - Queries should filter by `is_active = true` to exclude deleted records
*/

-- Add is_active column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Add is_active column to scheduling table
ALTER TABLE scheduling 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduling_is_active ON scheduling(is_active);

-- Update any existing NULL values to true (just in case)
UPDATE customers SET is_active = true WHERE is_active IS NULL;
UPDATE scheduling SET is_active = true WHERE is_active IS NULL;