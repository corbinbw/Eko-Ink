-- =====================================================
-- HIERARCHICAL TEAM MANAGEMENT SYSTEM
-- Migration 001: Add team hierarchy and invite system
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Update users table with hierarchy fields
-- =====================================================

-- Add manager relationship
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'manager_id'
    ) THEN
        ALTER TABLE users ADD COLUMN manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added manager_id column';
    ELSE
        RAISE NOTICE 'manager_id column already exists';
    END IF;

    -- Add team name (optional, for display purposes)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'team_name'
    ) THEN
        ALTER TABLE users ADD COLUMN team_name TEXT;
        RAISE NOTICE 'Added team_name column';
    ELSE
        RAISE NOTICE 'team_name column already exists';
    END IF;

    -- Add invite code for managers/executives
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'invite_code'
    ) THEN
        ALTER TABLE users ADD COLUMN invite_code TEXT UNIQUE;
        RAISE NOTICE 'Added invite_code column';
    ELSE
        RAISE NOTICE 'invite_code column already exists';
    END IF;

    -- Add super admin flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_super_admin'
    ) THEN
        ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_super_admin column';
    ELSE
        RAISE NOTICE 'is_super_admin column already exists';
    END IF;
END $$;

-- Create index for manager lookups
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);

-- =====================================================
-- STEP 2: Update role field to support new roles
-- =====================================================
-- Valid roles: 'rep', 'manager', 'executive', 'super_admin'
COMMENT ON COLUMN users.role IS 'User role: rep, manager, executive, super_admin';

-- =====================================================
-- STEP 3: Create teams table (optional but recommended)
-- =====================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add team_id to users for better organization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE users ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added team_id column';
    ELSE
        RAISE NOTICE 'team_id column already exists';
    END IF;
END $$;

-- Indexes for teams
CREATE INDEX IF NOT EXISTS idx_teams_account_id ON teams(account_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager_id ON teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);

-- Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Create invitations tracking table
-- =====================================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  inviter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- Role to assign to invitee
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

  -- Status tracking
  status TEXT DEFAULT 'active', -- active, used, revoked, expired
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Enable RLS on invitations table
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: Update RLS policies for hierarchy
-- =====================================================

-- Drop existing users policies
DROP POLICY IF EXISTS "Users can view same account users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- New hierarchical policies for users table
-- Reps can only see themselves and their manager
CREATE POLICY "Reps can view self and manager"
  ON users FOR SELECT
  USING (
    email = auth.jwt()->>'email' -- Can see self
    OR id = (SELECT manager_id FROM users WHERE email = auth.jwt()->>'email') -- Can see their manager
  );

-- Managers can see their reps and themselves
CREATE POLICY "Managers can view their team"
  ON users FOR SELECT
  USING (
    email = auth.jwt()->>'email' -- Can see self
    OR manager_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email') -- Their direct reports
    OR id = (SELECT manager_id FROM users WHERE email = auth.jwt()->>'email') -- Their manager
  );

-- Executives can see everyone in their account
CREATE POLICY "Executives can view account users"
  ON users FOR SELECT
  USING (
    (SELECT role FROM users WHERE email = auth.jwt()->>'email') = 'executive'
    AND account_id = public.user_account_id()
  );

-- Super admins can see everyone
-- Note: Uses COALESCE to handle NULL if column doesn't exist
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  USING (
    COALESCE((SELECT is_super_admin FROM users WHERE email = auth.jwt()->>'email'), false) = true
  );

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (email = auth.jwt()->>'email');

-- Managers and executives can update their team members
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
-- STEP 6: RLS policies for teams table
-- =====================================================

-- Users can view teams in their account
CREATE POLICY "Users can view account teams"
  ON teams FOR SELECT
  USING (
    account_id = public.user_account_id()
    OR COALESCE((SELECT is_super_admin FROM users WHERE email = auth.jwt()->>'email'), false) = true
  );

-- Managers and executives can create teams
CREATE POLICY "Managers can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE email = auth.jwt()->>'email') IN ('manager', 'executive')
    AND account_id = public.user_account_id()
  );

-- Managers can update their own teams
CREATE POLICY "Managers can update their teams"
  ON teams FOR UPDATE
  USING (
    manager_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
    OR (SELECT role FROM users WHERE email = auth.jwt()->>'email') = 'executive'
  );

-- =====================================================
-- STEP 7: RLS policies for invitations table
-- =====================================================

-- Users can view invitations they created
CREATE POLICY "Users can view own invitations"
  ON invitations FOR SELECT
  USING (
    inviter_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
    OR COALESCE((SELECT is_super_admin FROM users WHERE email = auth.jwt()->>'email'), false) = true
  );

-- Managers and executives can create invitations
CREATE POLICY "Managers can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE email = auth.jwt()->>'email') IN ('manager', 'executive')
    AND account_id = public.user_account_id()
  );

-- Users can update their own invitations
CREATE POLICY "Users can update own invitations"
  ON invitations FOR UPDATE
  USING (
    inviter_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email')
  );

-- =====================================================
-- STEP 8: Update notes/deals RLS for hierarchy
-- =====================================================

-- Drop existing notes policies
DROP POLICY IF EXISTS "Users can view own account notes" ON notes;
DROP POLICY IF EXISTS "Users can update own account notes" ON notes;

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
    OR user_id = (SELECT id FROM users WHERE email = auth.jwt()->>'email') -- And their own
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
    COALESCE((SELECT is_super_admin FROM users WHERE email = auth.jwt()->>'email'), false) = true
  );

-- Update policy
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
-- STEP 9: Helper functions
-- =====================================================

-- Function to generate random invite code
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.user_role() RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE email = auth.jwt()->>'email';
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.users WHERE email = auth.jwt()->>'email'),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to get team members (for a manager)
CREATE OR REPLACE FUNCTION public.get_team_members(manager_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  notes_sent_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.email, u.role, u.notes_sent_count, u.created_at
  FROM users u
  WHERE u.manager_id = manager_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 10: Update triggers
-- =====================================================

-- Add trigger for teams updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 11: Comments for documentation
-- =====================================================
COMMENT ON COLUMN users.manager_id IS 'Reference to manager user (for reps)';
COMMENT ON COLUMN users.team_name IS 'Display name for the team (optional)';
COMMENT ON COLUMN users.invite_code IS 'Unique code for inviting team members (managers/executives only)';
COMMENT ON COLUMN users.is_super_admin IS 'System admin flag (for EkoInk owner)';
COMMENT ON COLUMN users.team_id IS 'Reference to team (if using teams table)';

COMMENT ON TABLE teams IS 'Teams within an account (optional but recommended for organization)';
COMMENT ON TABLE invitations IS 'Track invite codes and their usage';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Update your application code to handle the new roles
-- 2. Update sign-up flow to capture role and handle invite codes
-- 3. Create role-specific dashboards
-- 4. Update credit purchasing to respect hierarchy
