/*
  # Create Appointments Table

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key) - Unique identifier for each appointment
      - `customer_id` (uuid, foreign key) - Reference to the customer
      - `type` (text) - Type of appointment: scheduled_install, site_survey, inspection, service_ticket
      - `title` (text) - Brief title for the appointment
      - `description` (text, optional) - Detailed description
      - `scheduled_date` (timestamptz) - When the appointment is scheduled
      - `technician_name` (text) - Name of the assigned technician
      - `status` (text) - Status: scheduled, completed, cancelled, in_progress
      - `created_at` (timestamptz) - When the record was created
      - `updated_at` (timestamptz) - When the record was last updated

  2. Security
    - Enable RLS on `appointments` table
    - Add policy for public read access (matching existing customer access pattern)
    - Add policy for public insert, update, and delete access
*/

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('scheduled_install', 'site_survey', 'inspection', 'service_ticket')),
  title text NOT NULL,
  description text DEFAULT '',
  scheduled_date timestamptz NOT NULL,
  technician_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'in_progress')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to appointments"
  ON appointments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to appointments"
  ON appointments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access to appointments"
  ON appointments
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to appointments"
  ON appointments
  FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(type);
CREATE INDEX IF NOT EXISTS idx_appointments_technician ON appointments(technician_name);