# EkoInk API System - Completion Checklist

**Created:** November 20, 2025
**Purpose:** Complete API system for customer who wants API access
**Current Status:** ~70% built, needs UI and documentation

---

## ✅ What's Already Built (Working)

### Backend Code
- ✅ `lib/api-keys.ts` - API key generation, hashing, validation
- ✅ `lib/api-middleware.ts` - Auth middleware with scope checking
- ✅ `lib/usage-tracker.ts` - Monthly usage tracking for billing
- ✅ Database migration ready (`migrations/004-add-api-keys-and-billing.sql`)

### API Endpoints (All V1 Routes)
- ✅ `POST /api/v1/deals` - Create deal
- ✅ `GET /api/v1/deals/:id` - Get deal by ID
- ✅ `GET /api/v1/notes/:id` - Get note by ID
- ✅ `POST /api/v1/notes/:id/approve` - Approve note
- ✅ `POST /api/v1/notes/:id/send` - Send note (billable event!)
- ✅ `GET /api/v1/account/usage` - Get monthly usage stats

### Admin Dashboard
- ✅ `/dashboard/admin` page exists (1,156 lines!)
- ✅ Shows revenue, usage stats, all accounts
- ⚠️ Not linked in navigation (accessed via direct URL)

### Features Working
- ✅ API key generation with SHA-256 hashing
- ✅ Scope-based permissions (deals:read, notes:write, etc.)
- ✅ Monthly usage tracking (cards sent, API calls)
- ✅ Billing calculation ($10/card sent)
- ✅ Account-level API key management

---

## ❌ What's Missing (Must Build)

### Critical (Needed for Customer)

**1. Run Database Migration**
- [ ] Go to Supabase SQL Editor
- [ ] Run `migrations/004-add-api-keys-and-billing.sql`
- [ ] Verify tables created: `api_keys`, `api_usage`
- [ ] Make your account admin:
  ```sql
  UPDATE accounts
  SET is_admin = TRUE
  WHERE id IN (SELECT account_id FROM users WHERE email = 'corbinbrandonwilliams@gmail.com');
  ```

**2. API Settings Page** (Customer needs this!)
- [ ] Create `/app/dashboard/settings/api/page.tsx`
- [ ] Show existing API keys (with masked values)
- [ ] "Generate New API Key" button
- [ ] Display full key ONCE after generation (copy to clipboard)
- [ ] Revoke key button
- [ ] Show scopes for each key
- [ ] Link from Settings page

**3. API Key Generation Endpoint**
- [ ] Create `/app/api/keys/generate/route.ts`
- [ ] Accepts: `{ name: string, scopes?: string[] }`
- [ ] Returns: `{ key: "sk_live_xxx", prefix: "sk_live_", masked: "sk_live_****xxx" }`
- [ ] Only shows full key in response (never again!)

**4. API Documentation Page**
- [ ] Create `/app/docs/api/page.tsx` (publicly accessible)
- [ ] Authentication section (how to use API keys)
- [ ] Endpoint documentation with examples:
  - POST /api/v1/deals
  - GET /api/v1/deals/:id
  - GET /api/v1/notes/:id
  - POST /api/v1/notes/:id/approve
  - POST /api/v1/notes/:id/send
  - GET /api/v1/account/usage
- [ ] Rate limits (60 req/min per key)
- [ ] Error codes reference
- [ ] Example requests (curl, JavaScript, Python)

**5. Link Admin Dashboard**
- [ ] Add "Admin" link to dashboard navigation
- [ ] Only show to users with `accounts.is_admin = TRUE`
- [ ] Link: `/dashboard/admin`

### Important (Needed Soon)

**6. Stripe Payment Method Setup**
- [ ] Add "API Billing" section to Settings
- [ ] Stripe Elements to save payment method
- [ ] Store `stripe_payment_method_id` in accounts table
- [ ] Show current payment method (last 4 digits)

**7. Monthly Invoice Generation**
- [ ] Create cron job endpoint: `/api/cron/generate-invoices`
- [ ] Runs on 1st of each month
- [ ] For each account with `billing_type='monthly_api'`:
  - Get usage from `api_usage` table
  - If `amount_owed_cents > 0`:
    - Create Stripe invoice
    - Charge saved payment method
    - Update `api_usage.invoice_status` to 'paid'
- [ ] Set up Vercel Cron to trigger

**8. Invoice Webhook Handler**
- [ ] Handle Stripe `invoice.paid` event
- [ ] Update `api_usage.invoice_status` and `invoice_paid_at`
- [ ] Handle `invoice.payment_failed` event
- [ ] Send email notification on failure

### Nice to Have (Can Defer)

**9. API Key Management**
- [ ] Edit key name
- [ ] Change key scopes
- [ ] Set expiration date
- [ ] View last used timestamp
- [ ] Usage logs per key

**10. Webhooks for Customers**
- [ ] Settings page to set webhook URL
- [ ] Send events: `note.generated`, `note.approved`, `note.sent`, `note.delivered`
- [ ] HMAC signature for security
- [ ] Retry logic for failed webhooks

**11. Rate Limiting**
- [ ] Use `@upstash/ratelimit` or similar
- [ ] 60 requests/minute per API key
- [ ] Return 429 Too Many Requests
- [ ] Include rate limit headers

**12. API Dashboard for Customers**
- [ ] Separate from admin dashboard
- [ ] Shows their API usage this month
- [ ] Recent API calls log
- [ ] Billing history
- [ ] Current month's invoice preview

---

## 🎯 Priority Order

### Week 1 (Customer Setup)
1. **Run migration** → 10 minutes
2. **Link admin dashboard** → 5 minutes
3. **Build API settings page** → 2-3 hours
4. **Build key generation endpoint** → 1 hour
5. **Test with customer's integration** → 1 hour

**Customer can start using API after Week 1!** ✅

### Week 2 (Documentation)
6. **Write API docs page** → 3-4 hours
7. **Add code examples** → 2 hours

### Week 3 (Billing Automation)
8. **Stripe payment method setup** → 3 hours
9. **Monthly invoice cron job** → 2-3 hours
10. **Invoice webhook handler** → 1-2 hours

### Later (When Needed)
11. Advanced key management
12. Customer webhooks
13. Rate limiting
14. Customer API dashboard

---

## 🚀 Quick Start Guide (For You)

### Step 1: Run Migration
```sql
-- In Supabase SQL Editor
-- Copy/paste migrations/004-add-api-keys-and-billing.sql

-- Then make yourself admin:
UPDATE accounts
SET is_admin = TRUE
WHERE id IN (SELECT account_id FROM users WHERE email = 'corbinbrandonwilliams@gmail.com');
```

### Step 2: Test Admin Dashboard
- Go to http://localhost:3003/dashboard/admin
- Should see revenue/usage stats
- Verify it loads without errors

### Step 3: Build API Settings Page
Create `app/dashboard/settings/api/page.tsx`:
```tsx
// Shows API keys
// Generate new key button
// Revoke key button
```

### Step 4: Test V1 Endpoints
Use curl to test:
```bash
# Generate test key (via new endpoint)
curl -X POST http://localhost:3003/api/keys/generate \
  -H "Cookie: ..." \
  -d '{"name": "Test Key"}'

# Test V1 endpoint with key
curl http://localhost:3003/api/v1/account/usage \
  -H "Authorization: Bearer sk_live_xxx"
```

### Step 5: Give Customer Their Key
- Customer gets their API key
- Send them link to docs page
- They integrate
- Monitor admin dashboard for usage

---

## 📝 Testing Checklist

Before giving to customer:
- [ ] Can generate API key via settings page
- [ ] API key authenticates correctly
- [ ] V1 endpoints return correct data
- [ ] Usage tracking increments on POST /send
- [ ] Admin dashboard shows their usage
- [ ] Docs page loads and is accurate
- [ ] Error messages are helpful

---

## 💰 Billing Notes

**Current Model:**
- $10 per card sent via API (same as dashboard users)
- Monthly invoicing (not pre-paid credits)
- Usage tracked in `api_usage` table
- Billed on 1st of each month for previous month

**Manual Process (First Month):**
1. Monitor `api_usage` table
2. Manually create Stripe invoice
3. Send to customer
4. Automate next month with cron job

---

## 🔒 Security Reminders

- API keys are hashed (SHA-256) - never store plaintext
- Full key shown ONCE after generation
- Use HTTPS only in production
- Validate scopes on every request
- Rate limit to prevent abuse
- Add IP whitelist if customer requests it

---

## Next Steps

**Start with:** Run the migration and link the admin dashboard (15 minutes total)

Then decide:
- **Fast path:** Build API settings page, give customer a key manually, defer docs to next week
- **Complete path:** Build settings page, docs, and billing before customer launch

**My recommendation:** Fast path - get customer started, iterate based on their feedback.
