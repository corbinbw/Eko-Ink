# Switching Stripe from Test Mode to Live Mode

## Step 1: Get Your Live Stripe Keys

1. Go to https://dashboard.stripe.com
2. In the top left, you'll see a toggle that says "Test mode" - **click it to switch to "Live mode"**
3. Once in Live mode, go to **Developers > API keys**
4. You'll see two keys:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`) - Click "Reveal live key token" to see it

## Step 2: Update Your Environment Variables

You need to update your `.env.local` file with the live keys:

```bash
# Replace your test keys with live keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY_HERE
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE
```

**IMPORTANT:** Keep your test keys somewhere safe in case you want to test new features in the future.

## Step 3: Set Up Webhooks for Live Mode

Stripe webhooks are separate for test mode and live mode. You need to create a new webhook endpoint for live mode:

1. In Stripe Dashboard (still in **Live mode**), go to **Developers > Webhooks**
2. Click **+ Add endpoint**
3. Enter your webhook URL:
   - If using production: `https://your-domain.com/api/webhooks/stripe`
   - If using local dev: You'll need to use Stripe CLI (see below)
4. Click **Select events** and choose:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to your `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
   ```

## Step 4: Using Stripe CLI for Local Development (Optional)

If you're still developing locally and want to test live mode webhooks:

```bash
# Install Stripe CLI if you haven't
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will give you a webhook signing secret that starts with `whsec_` - use this in your `.env.local`.

## Step 5: Restart Your Development Server

After updating `.env.local`, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Step 6: Test a Real Payment

1. Add a real credit card to your account
2. Try purchasing credits or setting up API billing
3. Check the admin dashboard to see if revenue is tracking correctly

## Important Notes

- **Real money:** Once you switch to live mode, all transactions will use real money
- **Test data:** Your existing test data (deals, notes, etc.) will remain in the database, but new Stripe transactions will be real
- **Dashboard revenue:** The $54.89 you see is from test transactions. New revenue from live mode will be added to this total
- **Separate test/live data:** Stripe keeps test mode and live mode data completely separate
- **Webhook secrets:** Test mode and live mode have different webhook secrets - make sure you use the live one

## Verification Checklist

After switching to live mode, verify:
- [ ] Can see live keys in Stripe Dashboard (Live mode)
- [ ] Updated `.env.local` with live keys
- [ ] Created webhook endpoint for live mode
- [ ] Updated webhook secret in `.env.local`
- [ ] Restarted development server
- [ ] Test payment works with real card
- [ ] Admin dashboard shows new revenue correctly

## Rollback to Test Mode

If you need to go back to test mode for development:
1. Switch back to your test keys in `.env.local`
2. Use your test webhook secret
3. Restart the server
