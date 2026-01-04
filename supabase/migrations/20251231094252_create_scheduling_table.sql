/*
  # Create Scheduling Table

  1. New Tables
    - `scheduling`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `appointment_type` (text) - 'site_survey', 'installation', or 'inspection'
      - `scheduled_date` (date)
      - `time_window_start` (time) - for site survey 2-hour windows
      - `time_window_end` (time) - for site survey 2-hour windows
      - `assigned_technicians` (text array) - names of assigned technicians
      - `status` (text) - 'pending', 'confirmed', 'completed', 'cancelled'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `scheduling` table
    - Add policy for public access (matching existing pattern)
*/

CREATE TABLE IF NOT EXISTS scheduling (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  appointment_type text NOT NULL CHECK (appointment_type IN ('site_survey', 'installation', 'inspection')),
  scheduled_date date,
  time_window_start time,
  time_window_end time,
  assigned_technicians text[] DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scheduling ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to scheduling"
  ON scheduling
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_scheduling_customer_id ON scheduling(customer_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_appointment_type ON scheduling(appointment_type);
CREATE INDEX IF NOT EXISTS idx_scheduling_scheduled_date ON scheduling(scheduled_date);