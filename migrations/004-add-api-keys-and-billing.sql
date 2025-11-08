-- Migration: Add API Keys and Monthly Billing Support
-- Run this in Supabase SQL Editor

-- =====================================================
-- API KEYS TABLE
-- =====================================================
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL = company-wide key

  -- Key security
  key_prefix TEXT NOT NULL, -- 'sk_live_' or 'sk_test_'
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of full key (never store plaintext!)

  -- Metadata
  name TEXT NOT NULL, -- e.g., "Production API", "Salesforce Integration"
  scopes TEXT[] NOT NULL DEFAULT ARRAY['deals:create', 'deals:read', 'notes:read', 'notes:write', 'notes:send'], -- What this key can access

  -- Status tracking
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- NULL = never expires
  revoked_at TIMESTAMPTZ, -- NULL = active

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Who created this key
  revoked_by UUID REFERENCES users(id) ON DELETE SET NULL -- Who revoked this key
);

-- Indexes
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_account ON api_keys(account_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_last_used ON api_keys(last_used_at DESC);

-- =====================================================
-- API USAGE TRACKING
-- =====================================================
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Billing period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 1-12

  -- Usage metrics
  cards_sent INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0, -- Total API calls this month

  -- Billing
  price_per_card_cents INTEGER DEFAULT 1000, -- $10.00 per card (same as dashboard users)
  amount_owed_cents INTEGER DEFAULT 0, -- Calculated: cards_sent * price_per_card_cents

  -- Stripe integration
  stripe_invoice_id TEXT UNIQUE, -- Stripe invoice ID
  invoice_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'void'
  invoice_paid_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(account_id, year, month)
);

-- Indexes
CREATE INDEX idx_api_usage_account ON api_usage(account_id);
CREATE INDEX idx_api_usage_period ON api_usage(year, month);
CREATE INDEX idx_api_usage_status ON api_usage(invoice_status) WHERE invoice_status != 'paid';

-- =====================================================
-- UPDATE ACCOUNTS TABLE
-- =====================================================
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'credits'; -- 'credits' or 'monthly_api'
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT; -- Saved payment method for monthly billing
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS api_monthly_limit INTEGER DEFAULT 100; -- Safety limit on cards/month
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS webhook_url TEXT; -- For sending status updates to customer
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS webhook_secret TEXT; -- For signing webhook payloads
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE; -- For EkoInk super admin accounts

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- API Keys: Users can only see keys from their own account
CREATE POLICY "Users can view own account api_keys"
  ON api_keys FOR SELECT
  USING (account_id = public.user_account_id());

CREATE POLICY "Users can insert api_keys"
  ON api_keys FOR INSERT
  WITH CHECK (account_id = public.user_account_id());

CREATE POLICY "Users can update own account api_keys"
  ON api_keys FOR UPDATE
  USING (account_id = public.user_account_id());

-- API Usage: Users can only see usage from their own account
CREATE POLICY "Users can view own account api_usage"
  ON api_usage FOR SELECT
  USING (account_id = public.user_account_id());

-- Admin policies: Super admins can see everything
CREATE POLICY "Admins can view all api_keys"
  ON api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = public.user_account_id()
      AND accounts.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can view all api_usage"
  ON api_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = public.user_account_id()
      AND accounts.is_admin = TRUE
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to track API usage
CREATE OR REPLACE FUNCTION increment_api_usage(
  p_account_id UUID,
  p_cards_sent INTEGER DEFAULT 0,
  p_api_calls INTEGER DEFAULT 1
)
RETURNS void AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM NOW());
  v_month INTEGER := EXTRACT(MONTH FROM NOW());
  v_price_per_card INTEGER := 1000; -- $10.00
BEGIN
  INSERT INTO api_usage (account_id, year, month, cards_sent, api_calls_count, amount_owed_cents)
  VALUES (
    p_account_id,
    v_year,
    v_month,
    p_cards_sent,
    p_api_calls,
    p_cards_sent * v_price_per_card
  )
  ON CONFLICT (account_id, year, month)
  DO UPDATE SET
    cards_sent = api_usage.cards_sent + p_cards_sent,
    api_calls_count = api_usage.api_calls_count + p_api_calls,
    amount_owed_cents = (api_usage.cards_sent + p_cards_sent) * v_price_per_card,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE TRIGGER update_api_usage_updated_at BEFORE UPDATE ON api_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA (Make your account an admin)
-- =====================================================
-- Run this with your actual email:
-- UPDATE accounts
-- SET is_admin = TRUE
-- WHERE id IN (SELECT account_id FROM users WHERE email = 'your-email@example.com');

COMMENT ON TABLE api_keys IS 'API keys for external integrations with monthly billing';
COMMENT ON TABLE api_usage IS 'Monthly usage tracking for API accounts';
COMMENT ON COLUMN accounts.billing_type IS 'credits = pre-paid credits, monthly_api = monthly invoice';
COMMENT ON COLUMN accounts.api_monthly_limit IS 'Safety limit on cards sent per month via API';
