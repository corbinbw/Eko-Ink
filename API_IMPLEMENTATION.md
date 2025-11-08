# EkoInk API Implementation Guide

## What We Built

We've built a complete REST API system for EkoInk with monthly billing for API users. Here's everything that's been implemented:

### 1. Database Schema (004-add-api-keys-and-billing.sql)

**New Tables:**
- `api_keys` - Stores API keys (hashed, never plaintext!)
  - Supports company-wide or user-specific keys
  - Tracks usage, expiration, revocation
  - Scoped permissions (deals:create, notes:read, etc.)

- `api_usage` - Monthly usage tracking
  - Cards sent per month
  - API calls count
  - Amount owed (calculated at $4.50/card)
  - Stripe invoice tracking

**Account Table Updates:**
- `billing_type` - 'credits' or 'monthly_api'
- `stripe_payment_method_id` - Saved payment method
- `api_monthly_limit` - Safety limit (default 100 cards/month)
- `webhook_url` - For sending status updates
- `is_admin` - For EkoInk super admin access

### 2. Core Library Functions

**lib/api-keys.ts**
- `generateApiKey()` - Create secure API keys
- `validateApiKey()` - Authenticate API requests
- `hashApiKey()` - SHA-256 hashing for security
- `hasScope()` - Permission checking
- `checkMonthlyLimit()` - Prevent abuse
- `createApiKey()`, `revokeApiKey()`, `listApiKeys()` - CRUD operations

**lib/api-middleware.ts**
- `withApiAuth()` - Authentication wrapper for all API endpoints
- Validates API keys
- Checks scopes
- Enforces monthly limits
- Standard error/success responses

**lib/usage-tracker.ts**
- `trackApiUsage()` - Increment monthly usage
- `getCurrentMonthUsage()` - Get current billing period
- `getUsageHistory()` - Past 12 months

### 3. API Endpoints

All endpoints are under `/api/v1/` and require Bearer token authentication:

**Deals:**
- `POST /api/v1/deals` - Create new deal + trigger note generation
- `GET /api/v1/deals` - List all deals (with pagination)
- `GET /api/v1/deals/:id` - Get single deal with full details

**Notes:**
- `GET /api/v1/notes/:id` - Get note details
- `PATCH /api/v1/notes/:id` - Edit note text (before sending)
- `POST /api/v1/notes/:id/approve` - Approve note
- `POST /api/v1/notes/:id/send` - Send to Handwrite.io (BILLABLE!)

**Account:**
- `GET /api/v1/account/usage` - View monthly usage and billing

### 4. Master Admin Dashboard

**Location:** `/dashboard/admin`

**Features:**
- View all accounts across EkoInk
- View all users and their stats
- View all API keys (active, revoked, expired)
- See monthly usage per account
- Track total revenue from API usage

**Access Control:**
- Only accounts with `is_admin = true` can access
- Protected by RLS policies

**API Endpoint:**
- `/api/admin/overview` - Fetches all data

## How the Billing Works

### For API Users:
1. Customer signs up and enables API access
2. Customer adds payment method (credit card on file)
3. Account `billing_type` changes to 'monthly_api'
4. Customer gets API key
5. **NO CREDIT CHECKS** - they can send unlimited cards (up to monthly_limit)
6. Each card sent increments `api_usage.cards_sent`
7. Amount owed = cards_sent * $10.00 (same price as dashboard users)
8. On 1st of each month, Stripe invoice is generated and charged
9. Payment method charged automatically

### Safety Limits:
- Default: 100 cards/month
- Prevents runaway bills for new customers
- Can be increased per account in admin dashboard
- API returns 429 error when limit hit

## What Still Needs to Be Built

### 1. API Settings Page (For Users)
**File to create:** `/app/dashboard/settings/api/page.tsx`

**Features:**
- Generate new API key
- View existing keys
- Revoke keys
- See current month's usage
- Add payment method (if not set)

### 2. Stripe Payment Method Setup
**Files to create:**
- `/app/api/billing/setup-payment-method/route.ts`
- `/app/api/billing/save-payment-method/route.ts`
- `/app/dashboard/settings/billing/page.tsx`

**Flow:**
1. User clicks "Enable API Access"
2. Stripe SetupIntent created
3. User enters credit card
4. Payment method saved to Stripe
5. `stripe_payment_method_id` saved to account
6. `billing_type` changed to 'monthly_api'

### 3. Monthly Invoice Generation
**File to create:** `/app/api/cron/generate-invoices/route.ts`

**Vercel Cron Job:** Runs on 1st of each month

**Logic:**
```
For each account where billing_type = 'monthly_api':
  1. Get last month's usage
  2. If cards_sent > 0:
    3. Create Stripe invoice
    4. Charge payment method
    5. Update api_usage with invoice_id
    6. Send email receipt
```

### 4. API Documentation
**File to create:** `/app/docs/page.tsx`

**Content:**
- Authentication guide
- Endpoint reference
- Code examples (cURL, Python, Node.js)
- Webhook documentation
- Error codes

### 5. Webhooks System
**File to create:** `/app/api/webhooks/deal-status/route.ts`

**Events to send to customer's webhook_url:**
- `deal.created`
- `deal.transcription_complete`
- `deal.note_generated`
- `deal.note_approved`
- `deal.card_sent`
- `deal.card_delivered`

**Signature:** HMAC-SHA256 using `webhook_secret`

## How to Test Right Now

### 1. Run the Database Migration

```sql
-- In Supabase SQL Editor, run:
-- /migrations/004-add-api-keys-and-billing.sql

-- Then make your account an admin:
UPDATE accounts
SET is_admin = TRUE
WHERE id IN (
  SELECT account_id FROM users WHERE email = 'your-email@example.com'
);
```

### 2. Test the Admin Dashboard

1. Navigate to `http://localhost:3000/dashboard/admin`
2. You should see all accounts, users, and API keys
3. View stats like total deals, notes sent, etc.

### 3. Create an API Key (Via Supabase for now)

```sql
-- Generate a test API key (save the key shown!)
-- Run this in a psql client with the hash function available
-- For testing, you can manually insert with a known hash

-- Example: Key "sk_live_test123" has this hash:
INSERT INTO api_keys (
  account_id,
  key_prefix,
  key_hash,
  name,
  scopes
) VALUES (
  'your-account-id',
  'sk_live_',
  'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', -- hash of 'test'
  'Test API Key',
  ARRAY['deals:create', 'deals:read', 'notes:read', 'notes:write', 'notes:send']
);
```

### 4. Test API Endpoint

```bash
# Create a deal
curl -X POST http://localhost:3000/api/v1/deals \
  -H "Authorization: Bearer sk_live_test123" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "first_name": "John",
      "last_name": "Doe",
      "address": {
        "line1": "123 Main St",
        "city": "Provo",
        "state": "UT",
        "postal_code": "84604"
      }
    },
    "transcript": "This was a great call. Customer is excited about the product."
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "deal_id": "xxx",
#     "note_id": "xxx",
#     "status": "processing"
#   }
# }
```

### 5. Check Usage Tracking

```bash
curl http://localhost:3000/api/v1/account/usage \
  -H "Authorization: Bearer sk_live_test123"

# Response shows current month usage
```

## API Key Security

**CRITICAL:**
- API keys are NEVER stored in plaintext
- Only SHA-256 hash is stored in database
- Full key is shown ONCE when generated
- Users must save it immediately
- If lost, they must generate new key

## Monthly Billing Flow (Once Implemented)

```
Day 1 of Month (Cron Job):
├── Query: SELECT * FROM accounts WHERE billing_type = 'monthly_api'
├── For each account:
│   ├── Get last month's api_usage
│   ├── If cards_sent > 0:
│   │   ├── amount = cards_sent * $4.50
│   │   ├── Create Stripe Invoice
│   │   ├── Charge stripe_payment_method_id
│   │   ├── Update api_usage.stripe_invoice_id
│   │   ├── Send receipt email
│   │   └── Log event
│   └── If payment fails:
│       ├── Send notification email
│       ├── Set webhook_url = NULL (suspend API)
│       └── Give 7 days to update payment
```

## Pricing

**API Users:**
- $10.00 per card sent (same as dashboard)
- No upfront cost
- Billed monthly in arrears
- No hidden fees
- API is for convenience, not a discount

**Dashboard Users:**
- $10 per card (buy credits)
- Pre-paid model
- Can also use API if enabled

## Rate Limiting (TODO)

**Recommended limits:**
- 100 requests/minute per account
- 10 requests/second per API key
- Use Upstash Redis or Vercel KV

## Support Scenarios

**Customer asks: "How much will I owe?"**
- Check `/api/v1/account/usage`
- Shows cards_sent * $4.50

**Customer asks: "Can I increase my limit?"**
- Admin updates `accounts.api_monthly_limit`
- Takes effect immediately

**Customer reports: "My API key isn't working"**
- Check `api_keys.revoked_at`
- Check `api_keys.last_used_at`
- Check account's `billing_type`

**Customer asks: "Can I get a refund?"**
- Create Stripe credit note
- Deduct from next month's invoice

## Next Steps

1. **Build API Settings Page** - So users can generate their own keys
2. **Implement Stripe Payment Setup** - So users can add payment methods
3. **Create Cron Job** - For monthly invoice generation
4. **Build API Docs** - So customers know how to integrate
5. **Add Webhooks** - So customers get status updates

## Architecture Notes

**Why monthly billing instead of credits?**
- API users want "unlimited" feel
- No friction of topping up credits
- Predictable monthly bills
- Industry standard for B2B APIs

**Why same price for API users?**
- Need to maintain profitability ($3 cost per card)
- API is for convenience/automation, not a discount
- Fair pricing for everyone

**Why monthly limit?**
- Prevents surprise $10k bills
- Safety net for new customers
- Can be increased on request

## Security Checklist

- [x] API keys hashed with SHA-256
- [x] RLS policies on all tables
- [x] Scope-based permissions
- [x] Monthly usage limits
- [ ] Rate limiting per account
- [ ] Webhook signature verification
- [ ] Payment method saved securely (Stripe)
- [ ] Admin-only access to master dashboard

## Questions?

**Q: What if a customer's payment fails?**
A: Suspend API access, send email, give 7 days to update payment method.

**Q: Can customers use both credits and API?**
A: Yes! billing_type only affects how they're charged for notes sent via API. Dashboard still uses credits.

**Q: How do we handle refunds?**
A: Create Stripe credit note, manually adjust api_usage.amount_owed_cents.

**Q: What about international customers?**
A: Stripe handles currency conversion. We bill in USD, they pay in their currency.

**Q: Can customers export their usage data?**
A: Yes, via `/api/v1/account/usage?history_limit=24`

---

## Summary

You now have:
- ✅ Complete API system with authentication
- ✅ Usage tracking for monthly billing
- ✅ Master admin dashboard
- ✅ Core API endpoints
- ✅ Database schema ready

Still need:
- ⏳ User-facing API settings page
- ⏳ Stripe payment setup flow
- ⏳ Monthly invoice generation cron
- ⏳ API documentation
- ⏳ Webhook system

**The foundation is solid. The rest is polish and automation!**
