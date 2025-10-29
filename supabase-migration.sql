-- EkoInk Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ACCOUNTS (Companies)
-- =====================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  domain TEXT,
  stripe_customer_id TEXT UNIQUE,
  credits_remaining INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USERS (Sales reps within accounts)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'rep', -- 'rep', 'admin', 'owner'

  -- Learning system
  notes_sent_count INTEGER DEFAULT 0,
  learning_complete BOOLEAN DEFAULT FALSE,

  -- Style preferences (populated after 25 notes)
  tone_preferences JSONB,
  style_examples TEXT[],
  handwriting_style_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DEALS (Closed-won sales)
-- =====================================================
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- External reference
  external_deal_id TEXT,

  -- Customer info
  customer_first_name TEXT NOT NULL,
  customer_last_name TEXT NOT NULL,
  customer_address JSONB NOT NULL,

  -- Deal details
  product_name TEXT,
  deal_value DECIMAL(10,2),
  closed_at TIMESTAMPTZ NOT NULL,
  personal_detail TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CALLS (Call recordings)
-- =====================================================
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  -- Audio file
  mp3_url TEXT,
  mp3_storage_path TEXT,
  duration_seconds INTEGER,

  -- Transcription
  transcript TEXT,
  key_moments TEXT,
  transcript_status TEXT DEFAULT 'pending', -- pending, processing, complete, failed
  assemblyai_id TEXT,

  -- Metadata
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  transcribed_at TIMESTAMPTZ
);

-- =====================================================
-- NOTES (Generated thank-you notes)
-- =====================================================
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

  -- Note content
  draft_text TEXT NOT NULL,
  final_text TEXT,

  -- Feedback (for learning system)
  feedback_given BOOLEAN DEFAULT FALSE,
  feedback_text TEXT,
  feedback_changes JSONB,

  -- Status tracking
  status TEXT DEFAULT 'draft', -- draft, approved, queued, sent, delivered, failed, returned
  requires_approval BOOLEAN DEFAULT TRUE,

  -- Handwrytten integration
  handwrytten_order_id TEXT,
  handwrytten_tracking_number TEXT,
  estimated_delivery_date DATE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- =====================================================
-- TRANSACTIONS (Payments & credits)
-- =====================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,

  -- Payment details
  stripe_payment_intent_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  credits_added INTEGER,

  -- Type
  transaction_type TEXT NOT NULL, -- 'purchase', 'charge', 'refund'
  description TEXT,

  -- Associated note (for per-note charges)
  note_id UUID REFERENCES notes(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EVENTS (Audit log)
-- =====================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,

  payload JSONB,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX idx_users_account_id ON users(account_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_deals_account_id ON deals(account_id);
CREATE INDEX idx_deals_user_id ON deals(user_id);
CREATE INDEX idx_calls_deal_id ON calls(deal_id);
CREATE INDEX idx_notes_deal_id ON notes(deal_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_status ON notes(status);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_events_account_id ON events(account_id);
CREATE INDEX idx_events_created_at ON events(created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's account_id from auth
CREATE OR REPLACE FUNCTION public.user_account_id() RETURNS UUID AS $$
  SELECT account_id FROM public.users WHERE email = auth.jwt()->>'email';
$$ LANGUAGE SQL SECURITY DEFINER;

-- Accounts: Users can only see their own account
CREATE POLICY "Users can view own account"
  ON accounts FOR SELECT
  USING (id = public.user_account_id());

CREATE POLICY "Users can update own account"
  ON accounts FOR UPDATE
  USING (id = public.user_account_id());

-- Users: Can view users in same account
CREATE POLICY "Users can view same account users"
  ON users FOR SELECT
  USING (account_id = public.user_account_id());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (email = auth.jwt()->>'email');

-- Deals: Can only see deals from own account
CREATE POLICY "Users can view own account deals"
  ON deals FOR SELECT
  USING (account_id = public.user_account_id());

CREATE POLICY "Users can insert deals"
  ON deals FOR INSERT
  WITH CHECK (account_id = public.user_account_id());

-- Calls: Can see calls for deals in own account
CREATE POLICY "Users can view own account calls"
  ON calls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = calls.deal_id
      AND deals.account_id = public.user_account_id()
    )
  );

-- Notes: Can see notes for own account
CREATE POLICY "Users can view own account notes"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = notes.deal_id
      AND deals.account_id = public.user_account_id()
    )
  );

CREATE POLICY "Users can update own account notes"
  ON notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = notes.deal_id
      AND deals.account_id = public.user_account_id()
    )
  );

-- Transactions: Can view own account transactions
CREATE POLICY "Users can view own account transactions"
  ON transactions FOR SELECT
  USING (account_id = public.user_account_id());

-- Events: Can view own account events
CREATE POLICY "Users can view own account events"
  ON events FOR SELECT
  USING (account_id = public.user_account_id());

-- =====================================================
-- STORAGE BUCKET for MP3 files
-- =====================================================
-- Run this separately in Supabase Storage UI or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('call-audio', 'call-audio', false);

-- Storage policy: Users can only access their account's files
-- CREATE POLICY "Users can upload call audio"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'call-audio' AND auth.role() = 'authenticated');

-- CREATE POLICY "Users can read own account call audio"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'call-audio' AND auth.role() = 'authenticated');

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA (optional - for testing)
-- =====================================================

-- Create a test account
-- INSERT INTO accounts (company_name, credits_remaining)
-- VALUES ('Test Company', 10000) -- $100 in credits
-- RETURNING id;

-- Create a test user (you'll need to link this to Supabase Auth user)
-- INSERT INTO users (account_id, email, name, role)
-- VALUES
--   ('<account_id_from_above>', 'test@example.com', 'Test User', 'owner');

