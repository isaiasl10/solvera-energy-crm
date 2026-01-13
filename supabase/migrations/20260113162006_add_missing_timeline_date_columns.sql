/*
  # Add Missing Date Columns to Project Timeline

  1. Overview
    - Adds all missing date tracking columns to project_timeline table
    - These columns are required by the ProjectTimeline component
    
  2. New Columns
    - `site_survey_scheduled_date` - When site survey is scheduled
    - `site_survey_completed_date` - When site survey is completed
    - `engineering_plans_received_date` - When engineering plans are received
    - `utility_application_submitted_date` - When utility app is submitted
    - `utility_application_approved_date` - When utility app is approved
    - `city_permits_submitted_date` - When city permits are submitted
    - `city_permits_approved_date` - When city permits are approved
    - `material_ordered_date` - When material is ordered
    - `material_drop_ship_location` - Drop ship location (customer_home/warehouse)
    - `homeowner_contacted_for_delivery` - Whether homeowner was contacted
    - `installation_scheduled_date` - When installation is scheduled
    - `installation_completed_date` - When installation is completed
    - `pto_submitted_date` - When PTO is submitted
    - `pto_approved_date` - When PTO is approved
    - `system_activated_date` - When system is activated
*/

-- Add all missing date columns
DO $$
BEGIN
  -- Site Survey dates
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'site_survey_scheduled_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN site_survey_scheduled_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'site_survey_completed_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN site_survey_completed_date timestamptz;
  END IF;

  -- Engineering
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'engineering_plans_received_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN engineering_plans_received_date timestamptz;
  END IF;

  -- Utility Application
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'utility_application_submitted_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN utility_application_submitted_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'utility_application_approved_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN utility_application_approved_date timestamptz;
  END IF;

  -- City Permits
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'city_permits_submitted_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN city_permits_submitted_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'city_permits_approved_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN city_permits_approved_date timestamptz;
  END IF;

  -- Material Order
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'material_ordered_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN material_ordered_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'material_drop_ship_location'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN material_drop_ship_location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'homeowner_contacted_for_delivery'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN homeowner_contacted_for_delivery boolean DEFAULT false;
  END IF;

  -- Installation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'installation_scheduled_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN installation_scheduled_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'installation_completed_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN installation_completed_date timestamptz;
  END IF;

  -- PTO
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'pto_submitted_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN pto_submitted_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'pto_approved_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN pto_approved_date timestamptz;
  END IF;

  -- System Activation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'system_activated_date'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN system_activated_date timestamptz;
  END IF;
END $$;