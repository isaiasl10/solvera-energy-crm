/*
  # Add Multi-Tenant Support for Auric-Core Platform

  1. New Tables
    - `organizations` - Company/tenant data
    - `platform_admins` - Super admins who can access all organizations

  2. Schema Changes
    - Add `organization_id` to all existing tables
    - Add `is_organization_owner` flag to app_users

  3. Security
    - Enable RLS on organizations table
    - Create RLS policies for organization isolation

  4. Data Migration
    - Create default organization (Solvera Energy)
    - Migrate existing data to default organization
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  domain text UNIQUE,
  logo_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
  subscription_tier text NOT NULL DEFAULT 'professional' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  trial_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  settings jsonb DEFAULT '{}'::jsonb
);

-- Create platform admins table
CREATE TABLE IF NOT EXISTS platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert default organization (Solvera Energy)
INSERT INTO organizations (name, slug, status, subscription_status)
VALUES ('Solvera Energy', 'solveraenergy', 'active', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Add organization_id columns to all tables

-- app_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE app_users ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE app_users SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'is_organization_owner'
  ) THEN
    ALTER TABLE app_users ADD COLUMN is_organization_owner boolean DEFAULT false;
  END IF;
END $$;

-- customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE customers SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

-- documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE documents SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

-- appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE appointments SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

-- scheduling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduling' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE scheduling ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE scheduling SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

-- time_clock
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_clock' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE time_clock ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE time_clock SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

-- sales_commissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_commissions' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE sales_commissions ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE sales_commissions SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

-- project_timeline
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timeline' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE project_timeline ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE project_timeline SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

-- project_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_messages' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE project_messages ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE project_messages SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

-- project_activity_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_activity_log' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE project_activity_log ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE project_activity_log SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

-- Admin tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'panels' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE panels ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE panels SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inverters' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE inverters ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE inverters SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimizers' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE optimizers ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE optimizers SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'racking' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE racking ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE racking SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batteries' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE batteries ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE batteries SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_adders' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE custom_adders ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE custom_adders SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financiers' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE financiers ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE financiers SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financing_products' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE financing_products ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE financing_products SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_financing' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE customer_financing ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE customer_financing SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

-- Photo tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installation_photos' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE installation_photos ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE installation_photos SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_survey_photos' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE site_survey_photos ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE site_survey_photos SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_photos' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE inspection_photos ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    UPDATE inspection_photos SET organization_id = (SELECT id FROM organizations WHERE slug = 'solveraenergy');
  END IF;
END $$;

-- Enable RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations (allow public read for now during setup)
CREATE POLICY "Allow public read for organizations"
  ON organizations FOR SELECT
  USING (true);

CREATE POLICY "Organization owners can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM app_users 
      WHERE id = auth.uid()
      AND is_organization_owner = true
    )
  );

-- Enable RLS on platform_admins
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Platform admins can view their own record
CREATE POLICY "Platform admins can view own record"
  ON platform_admins FOR SELECT
  USING (id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_users_organization_id ON app_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_organization_id ON scheduling(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_organization_id ON time_clock(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_organization_id ON sales_commissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_timeline_organization_id ON project_timeline(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
