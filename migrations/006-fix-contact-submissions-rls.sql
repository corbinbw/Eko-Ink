-- Fix RLS policy infinite recursion on contact_submissions table
-- The previous policies referenced the users table which created circular dependency

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all contact submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admins can update contact submissions" ON contact_submissions;

-- Keep the insert policy for anonymous users (this one is fine)
-- Anyone can submit (public endpoint) - already exists from migration 005

-- Add service role policies instead (these bypass RLS and are used by service_role key)
-- These don't create recursion because they don't reference users table

-- Service role can view all submissions (used by admin API)
CREATE POLICY "Service role can view all contact submissions"
  ON contact_submissions
  FOR SELECT
  TO service_role
  USING (true);

-- Service role can update submissions (used by admin API)
CREATE POLICY "Service role can update contact submissions"
  ON contact_submissions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON POLICY "Service role can view all contact submissions" ON contact_submissions IS
  'Allows service role (admin APIs) to view all submissions without RLS recursion';
COMMENT ON POLICY "Service role can update contact submissions" ON contact_submissions IS
  'Allows service role (admin APIs) to update submissions without RLS recursion';
