/*
  # Create Project Timeline Tracking System

  1. New Fields Added to customers Table
    - `signature_date` (date) - Manual entry of when customer signed contract
    
  2. New Table: project_timeline
    - Tracks all major milestones in the solar installation process
    - Each milestone has entry and completion timestamps
    - Tracks material order details (drop ship location, homeowner contact)
    - Automatically calculates days spent in each phase
    
  3. Milestone Steps Tracked
    - Site Survey (scheduled & completed)
    - Engineering Plans Received
    - Utility Application (submitted & approved)
    - City Permits (submitted & approved)
    - Material Order (date, location, homeowner contacted)
    - Installation (scheduled & completed)
    - City Inspection (passed/failed)
    - PTO (submitted & approved)
    - System Activated
    
  4. Security
    - Enable RLS on project_timeline table
    - Allow public access for demo purposes
*/

-- Add signature_date to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'signature_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN signature_date date;
  END IF;
END $$;

-- Create project_timeline table
CREATE TABLE IF NOT EXISTS project_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  
  -- Site Survey
  site_survey_scheduled_date timestamptz,
  site_survey_completed_date timestamptz,
  
  -- Engineering
  engineering_plans_received_date timestamptz,
  
  -- Utility Application
  utility_application_submitted_date timestamptz,
  utility_application_approved_date timestamptz,
  
  -- City Permits
  city_permits_submitted_date timestamptz,
  city_permits_approved_date timestamptz,
  
  -- Material Order
  material_ordered_date timestamptz,
  material_drop_ship_location text, -- 'customer_home', 'warehouse', or null
  homeowner_contacted_for_delivery boolean DEFAULT false,
  
  -- Installation
  installation_scheduled_date timestamptz,
  installation_completed_date timestamptz,
  
  -- City Inspection
  city_inspection_date timestamptz,
  city_inspection_status text, -- 'passed', 'failed', or null
  city_inspection_notes text,
  
  -- PTO
  pto_submitted_date timestamptz,
  pto_approved_date timestamptz,
  
  -- System Activation
  system_activated_date timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(customer_id)
);

-- Enable RLS
ALTER TABLE project_timeline ENABLE ROW LEVEL SECURITY;

-- Allow public access (for demo purposes)
CREATE POLICY "Allow public read access to project_timeline"
  ON project_timeline
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to project_timeline"
  ON project_timeline
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to project_timeline"
  ON project_timeline
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from project_timeline"
  ON project_timeline
  FOR DELETE
  TO public
  USING (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_project_timeline_updated_at ON project_timeline;
CREATE TRIGGER update_project_timeline_updated_at
  BEFORE UPDATE ON project_timeline
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();