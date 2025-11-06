-- =====================================================
-- HIERARCHICAL TEAM MANAGEMENT SYSTEM - RLS POLICIES
-- Migration 002: Update RLS policies for hierarchy
-- Run this AFTER 001-hierarchical-teams-SIMPLE.sql
-- =====================================================

-- =====================================================
-- STEP 1: Create is_super_admin helper function
-- =====================================================

-- Function to check if user is super admin
-- (Must be created here after column exists)
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT COALESCE(u.is_super_admin, false) INTO result
  FROM public.users u
  WHERE u.email = auth.jwt()->>'email';

  RETURN COALESCE(result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: Drop existing policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view same account users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own account notes" ON notes;
DROP POLICY IF EXISTS "Users can update own account notes" ON notes;

-- =====================================================
-- STEP 3: Create new hierarchical policies for users
-- =====================================================

-- Reps can see themselves and their manager
CREATE POLICY "Reps can view self and manager"
  ON users FOR SELECT
  USING (
    email = auth.jwt()->>'email'
    OR id = (SELECT manager_id FROM users WHERE email = auth.jwt()->>'email')
  );

-- Managers can see their team
CREATE POLICY "Managers can view their team"
  ON users FOR SELECT
  USING (
    email = auth.jwt()->>'email'
    OR manager_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
    OR id = (SELECT manager_id FROM users WHERE email = auth.jwt()->>'email')
  );

-- Executives can see everyone in their account
CREATE POLICY "Executives can view account users"
  ON users FOR SELECT
  USING (
    (SELECT role FROM users WHERE email = auth.jwt()->>'email') = 'executive'
    AND account_id = public.user_account_id()
  );

-- Super admins can see everyone
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  USING (
    public.is_super_admin() = true
  );

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (email = auth.jwt()->>'email');

-- Managers can update team members
CREATE POLICY "Managers can update team members"
  ON users FOR UPDATE
  USING (
    manager_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
    OR (
      (SELECT role FROM users WHERE email = auth.jwt()->>'email') IN ('executive', 'super_admin')
      AND account_id = public.user_account_id()
    )
  );

-- =====================================================
-- STEP 4: RLS policies for teams table
-- =====================================================

CREATE POLICY "Users can view account teams"
  ON teams FOR SELECT
  USING (
    account_id = public.user_account_id()
    OR public.is_super_admin() = true
  );

CREATE POLICY "Managers can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE email = auth.jwt()->>'email') IN ('manager', 'executive')
    AND account_id = public.user_account_id()
  );

CREATE POLICY "Managers can update their teams"
  ON teams FOR UPDATE
  USING (
    manager_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
    OR (SELECT role FROM users WHERE email = auth.jwt()->>'email') = 'executive'
  );

-- =====================================================
-- STEP 5: RLS policies for invitations table
-- =====================================================

CREATE POLICY "Users can view own invitations"
  ON invitations FOR SELECT
  USING (
    inviter_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
    OR public.is_super_admin() = true
  );

CREATE POLICY "Managers can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE email = auth.jwt()->>'email') IN ('manager', 'executive')
    AND account_id = public.user_account_id()
  );

CREATE POLICY "Users can update own invitations"
  ON invitations FOR UPDATE
  USING (
    inviter_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
  );

-- =====================================================
-- STEP 6: Update notes RLS for hierarchy
-- =====================================================

-- Reps can see their own notes
CREATE POLICY "Reps can view own notes"
  ON notes FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
  );

-- Managers can see their team's notes
CREATE POLICY "Managers can view team notes"
  ON notes FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE manager_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
    )
    OR user_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
  );

-- Executives can see all notes in their account
CREATE POLICY "Executives can view account notes"
  ON notes FOR SELECT
  USING (
    (SELECT role FROM users WHERE email = auth.jwt()->>'email') IN ('executive', 'super_admin')
    AND EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = notes.deal_id
      AND deals.account_id = public.user_account_id()
    )
  );

-- Super admins can see all notes
CREATE POLICY "Super admins can view all notes"
  ON notes FOR SELECT
  USING (
    public.is_super_admin() = true
  );

-- Users can update notes
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (
    user_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
    OR user_id IN (
      SELECT id FROM users
      WHERE manager_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
    )
    OR (SELECT role FROM users WHERE email = auth.jwt()->>'email') IN ('executive', 'super_admin')
  );

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
