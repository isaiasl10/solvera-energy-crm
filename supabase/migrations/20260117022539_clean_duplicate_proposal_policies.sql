/*
  # Clean Up Duplicate Proposal Policies

  1. Problem
    - Multiple overlapping policies on proposal tables
    - Causes confusion and potential permission conflicts
    - "Authenticated users can manage" ALL policy is sufficient

  2. Solution
    - Keep only the comprehensive ALL policy per table
    - Drop all the granular creator-based policies (redundant)

  3. Impact
    - Simplifies RLS
    - Maintains same access level (authenticated users)
    - Reduces policy evaluation overhead
*/

-- Drop duplicate proposal_obstructions policies
DROP POLICY IF EXISTS "Users can create obstructions for own proposals" ON proposal_obstructions;
DROP POLICY IF EXISTS "Users can delete own proposal obstructions" ON proposal_obstructions;
DROP POLICY IF EXISTS "Users can update own proposal obstructions" ON proposal_obstructions;
DROP POLICY IF EXISTS "Users can view own proposal obstructions" ON proposal_obstructions;
DROP POLICY IF EXISTS "obstructions creator can delete" ON proposal_obstructions;
DROP POLICY IF EXISTS "obstructions creator can insert" ON proposal_obstructions;
DROP POLICY IF EXISTS "obstructions creator can read" ON proposal_obstructions;
DROP POLICY IF EXISTS "obstructions creator can update" ON proposal_obstructions;
DROP POLICY IF EXISTS "obstructions_all_via_proposal" ON proposal_obstructions;

-- Drop duplicate proposal_panels policies
DROP POLICY IF EXISTS "panels creator can delete" ON proposal_panels;
DROP POLICY IF EXISTS "panels creator can insert" ON proposal_panels;
DROP POLICY IF EXISTS "panels creator can read" ON proposal_panels;
DROP POLICY IF EXISTS "panels_all_via_proposal" ON proposal_panels;

-- Drop duplicate proposal_roof_planes policies
DROP POLICY IF EXISTS "roof planes creator can delete" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof planes creator can insert" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof planes creator can read" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof planes creator can update" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof_planes_delete_via_proposal" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof_planes_insert_via_proposal" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof_planes_select_via_proposal" ON proposal_roof_planes;
DROP POLICY IF EXISTS "roof_planes_update_via_proposal" ON proposal_roof_planes;
