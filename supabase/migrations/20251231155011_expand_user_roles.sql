/*
  # Expand User Roles System

  1. Changes to Tables
    - `app_users`
      - Update `role` field to support expanded role types
      - Add `role_category` field for grouping (employee, management, field_tech, admin)

  2. New Role Types
    - **Employee Roles:** customer_service, procurement, scheduling
    - **Management Roles:** field_ops_manager, office_manager, project_manager, procurement_manager, roof_lead, foreman
    - **Field Tech Roles:** battery_tech, service_tech, journeyman_electrician, master_electrician, apprentice_electrician, residential_wireman
    - **Admin Roles:** admin

  3. Details
    - Role categories help organize and filter users by department
    - Access level control will be implemented separately in the future
*/

-- Add role_category column
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS role_category text;

-- Drop the old role constraint
ALTER TABLE app_users 
DROP CONSTRAINT IF EXISTS app_users_role_check;

-- Add new role constraint with all expanded roles
ALTER TABLE app_users 
ADD CONSTRAINT app_users_role_check CHECK (
  role IN (
    -- Employee Roles
    'customer_service', 'procurement', 'scheduling',
    -- Management Roles
    'field_ops_manager', 'office_manager', 'project_manager', 
    'procurement_manager', 'roof_lead', 'foreman',
    -- Field Tech Roles
    'battery_tech', 'service_tech', 'journeyman_electrician', 
    'master_electrician', 'apprentice_electrician', 'residential_wireman',
    -- Admin
    'admin',
    -- Legacy roles for backward compatibility
    'technician', 'manager', 'sales_rep'
  )
);

-- Add role_category constraint
ALTER TABLE app_users 
ADD CONSTRAINT app_users_role_category_check CHECK (
  role_category IN ('employee', 'management', 'field_tech', 'admin')
);

-- Create index for role_category
CREATE INDEX IF NOT EXISTS idx_app_users_role_category ON app_users(role_category);

-- Update existing records to have proper role_category
UPDATE app_users 
SET role_category = CASE 
  WHEN role = 'admin' THEN 'admin'
  WHEN role IN ('manager', 'field_ops_manager', 'office_manager', 'project_manager', 'procurement_manager', 'roof_lead', 'foreman') THEN 'management'
  WHEN role IN ('technician', 'battery_tech', 'service_tech', 'journeyman_electrician', 'master_electrician', 'apprentice_electrician', 'residential_wireman') THEN 'field_tech'
  ELSE 'employee'
END
WHERE role_category IS NULL;