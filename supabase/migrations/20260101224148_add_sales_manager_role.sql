/*
  # Add Sales Manager Role

  1. Changes
    - Add 'sales_manager' to the app_users role constraint
    - This allows creating users with the sales_manager role
  
  2. Notes
    - Sales managers can oversee sales representatives
    - Typically assigned to management role category
*/

-- Drop the existing role constraint
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;

-- Add the updated constraint with sales_manager included
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check 
CHECK (role IN (
  'customer_service',
  'procurement',
  'scheduling',
  'field_ops_manager',
  'office_manager',
  'project_manager',
  'procurement_manager',
  'roof_lead',
  'foreman',
  'battery_tech',
  'service_tech',
  'journeyman_electrician',
  'master_electrician',
  'apprentice_electrician',
  'residential_wireman',
  'pv_installer',
  'admin',
  'technician',
  'manager',
  'sales_rep',
  'sales_manager'
));
