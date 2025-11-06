-- =====================================================
-- HIERARCHICAL TEAM MANAGEMENT SYSTEM - SIMPLIFIED
-- Migration 001: Add team hierarchy (columns and tables only)
-- Run this FIRST in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Add new columns to users table
-- =====================================================

DO $$
BEGIN
    -- Add manager relationship
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'manager_id'
    ) THEN
        ALTER TABLE users ADD COLUMN manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Add team name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'team_name'
    ) THEN
        ALTER TABLE users ADD COLUMN team_name TEXT;
    END IF;

    -- Add invite code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'invite_code'
    ) THEN
        ALTER TABLE users ADD COLUMN invite_code TEXT UNIQUE;
    END IF;

    -- Add super admin flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_super_admin'
    ) THEN
        ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);

-- =====================================================
-- STEP 2: Create teams table
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

-- Add team_id to users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE users ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes for teams
CREATE INDEX IF NOT EXISTS idx_teams_account_id ON teams(account_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager_id ON teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Create invitations table
-- =====================================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  inviter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Helper functions
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

-- Function to get team members
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
-- STEP 5: Add trigger for teams updated_at
-- =====================================================

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUCCESS!
-- =====================================================
-- Tables and columns created successfully
-- Now you need to update the RLS policies manually in Supabase dashboard
-- or run the second migration file
