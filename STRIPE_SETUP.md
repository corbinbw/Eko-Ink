# Stripe Setup Guide

This guide will help you set up Stripe payment integration for the credits system.

## Step 1: Create a Stripe Account

1. Go to https://stripe.com and sign up for a free account
2. Complete the account verification process

## Step 2: Get Your API Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)
4. Add these to your `.env.local` file:

```env
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
```

## Step 3: Set Up Webhook for Local Testing

### Option A: Using Stripe CLI (Recommended for local development)

1. Install Stripe CLI:
   - Mac: `brew install stripe/stripe-cli/stripe`
   - Windows: Download from https://github.com/stripe/stripe-cli/releases
   - Linux: Download from https://github.com/stripe/stripe-cli/releases

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the webhook signing secret (starts with `whsec_`) from the CLI output

5. Add it to your `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET_HERE
   ```

6. Keep the `stripe listen` command running while testing payments

### Option B: Using ngrok (Alternative)

1. Install ngrok: https://ngrok.com/download
2. Start ngrok: `ngrok http 3000`
3. Go to https://dashboard.stripe.com/test/webhooks
4. Click "Add endpoint"
5. Enter your ngrok URL + `/api/stripe/webhook`
6. Select event: `checkout.session.completed`
7. Copy the webhook signing secret and add to `.env.local`

## Step 4: Test the Integration

1. Restart your Next.js dev server to load the new environment variables
2. Go to http://localhost:3000/dashboard/credits
3. Click on any credit package
4. Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

## Important Notes

- **Test Mode**: The keys above are test keys. They won't charge real money.
- **Webhook**: Make sure the webhook is running when testing payments
- **Production**: When ready for production, get your live keys from https://dashboard.stripe.com/apikeys

## Troubleshooting

### Payment succeeds but credits don't update
- Check that the webhook is running
- Check the webhook logs in Stripe dashboard
- Verify the webhook secret is correct in `.env.local`

### "Stripe failed to load" error
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set correctly
- Make sure you restarted the dev server after adding the keys

### Webhook signature verification fails
- Make sure you're using the correct webhook secret
- If using Stripe CLI, make sure `stripe listen` is running
- Check that the webhook URL matches exactly

## Credit Packages

The following packages are available:

| Package | Credits | Price |
|---------|---------|-------|
| Starter | 10 | $29.99 |
| Popular | 25 | $69.99 |
| Business | 50 | $129.99 |
| Enterprise | 100 | $229.99 |

## Files Modified

- `/app/dashboard/credits/page.tsx` - Credits purchase page
- `/app/dashboard/credits/success/page.tsx` - Success page after payment
- `/app/api/stripe/create-checkout-session/route.ts` - Creates Stripe checkout
- `/app/api/stripe/webhook/route.ts` - Handles payment webhooks
- `.env.local` - Environment variables

## Need Help?

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com/
