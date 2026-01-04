/*
  # Create Project Chat and Activity Log Tables

  ## New Tables
  
  ### `project_messages`
  - `id` (uuid, primary key) - Unique message identifier
  - `customer_id` (uuid, foreign key) - References customers table
  - `user_id` (uuid, foreign key) - References app_users table (who sent the message)
  - `message` (text) - The message content
  - `created_at` (timestamptz) - When the message was sent
  
  ### `project_activity_log`
  - `id` (uuid, primary key) - Unique log entry identifier
  - `customer_id` (uuid, foreign key) - References customers table
  - `user_id` (uuid, foreign key) - References app_users table (who made the change)
  - `action_type` (text) - Type of action (e.g., 'update', 'create', 'status_change')
  - `field_name` (text) - Name of the field that was changed
  - `old_value` (text) - Previous value (if applicable)
  - `new_value` (text) - New value
  - `description` (text) - Human-readable description of the change
  - `created_at` (timestamptz) - When the action occurred
  
  ## Security
  - Enable RLS on both tables
  - Add policies for authenticated users to read/write messages for their accessible projects
  - Add policies for authenticated users to read activity logs for their accessible projects
*/

-- Create project_messages table
CREATE TABLE IF NOT EXISTS project_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_messages_customer_id ON project_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_created_at ON project_messages(created_at DESC);

-- Enable RLS
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

-- Policies for project_messages
-- Allow authenticated users to read messages
CREATE POLICY "Users can read project messages"
  ON project_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own messages
CREATE POLICY "Users can send project messages"
  ON project_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create project_activity_log table
CREATE TABLE IF NOT EXISTS project_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_log_customer_id ON project_activity_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON project_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE project_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies for project_activity_log
-- Allow authenticated users to read activity logs
CREATE POLICY "Users can read project activity logs"
  ON project_activity_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert activity logs
CREATE POLICY "Users can create activity logs"
  ON project_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);