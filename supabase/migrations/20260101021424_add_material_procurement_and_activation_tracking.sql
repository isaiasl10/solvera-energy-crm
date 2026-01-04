/*
  # Add Material Procurement and Activation Tracking

  1. New Columns
    - `material_quote_received` (boolean) - Tracks if procurement team has provided a quote
    - `customer_delivery_confirmed` (boolean) - Tracks if customer has confirmed delivery preferences
    - `activation_method` (text) - Tracks activation method: 'pending', 'tech_dispatch', 'remote'
    - `activation_scheduled_date` (timestamptz) - Date when tech is scheduled for activation
    - `activation_completed_date` (timestamptz) - Date when system was activated
  
  2. Changes
    - Add new fields to project_timeline table to support material ordering workflow
    - Add new fields to support system activation workflow
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'material_quote_received'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN material_quote_received boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'customer_delivery_confirmed'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN customer_delivery_confirmed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'activation_method'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN activation_method text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'activation_scheduled_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN activation_scheduled_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'activation_completed_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN activation_completed_date timestamptz;
  END IF;
END $$;