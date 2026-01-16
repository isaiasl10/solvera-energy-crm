/*
  # Make phone_number Column Nullable

  ## Overview
  Removes the NOT NULL constraint from the phone_number column in the customers table
  to allow creating records without a phone number (e.g., subcontract jobs).

  ## Changes

  1. Alter phone_number column to allow NULL values
  
  ## Rationale
  - Subcontract jobs may not have a phone number when initially created
  - Phone number can be added later when more information is available
  - This prevents insertion errors for incomplete records

  ## Security
    - No changes to RLS policies
*/

-- Make phone_number nullable
ALTER TABLE customers ALTER COLUMN phone_number DROP NOT NULL;