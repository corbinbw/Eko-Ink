# EkoInk Production Deployment Checklist

## ✅ Pre-Deployment (Completed)

- [x] All code committed to GitHub
- [x] TypeScript errors fixed
- [x] Live Stripe keys ready
- [x] Database migrations ready to run

## 📋 Deployment Steps

### 1. Deploy to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New Project"
4. Import `corbinbw/Eko-Ink` repository
5. Configure project:
   - Framework Preset: Next.js (should auto-detect)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

### 2. Add Environment Variables in Vercel

Click "Environment Variables" and add all of these:

```
# Copy these from your .env.local file
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

OPENAI_API_KEY=your_openai_api_key

ANTHROPIC_API_KEY=your_anthropic_api_key

ASSEMBLYAI_API_KEY=your_assemblyai_api_key

HANDWRITEIO_API_KEY=your_handwriteio_api_key
HANDWRITEIO_DEFAULT_HANDWRITING_ID=your_handwriting_style_id
HANDWRITEIO_DEFAULT_CARD_ID=your_default_card_id
HANDWRITEIO_TEST_MODE=false

STRIPE_SECRET_KEY=your_stripe_live_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_live_publishable_key
STRIPE_WEBHOOK_SECRET=(leave blank for now - will add after webhook setup)

NEXT_PUBLIC_APP_URL=https://your-production-domain.vercel.app
NODE_ENV=production
```

**IMPORTANT:** Make sure each environment variable is set for "Production", "Preview", and "Development" environments in Vercel.

6. Click "Deploy"

### 3. Wait for Deployment

Vercel will:
- Install dependencies
- Run `npm run build`
- Deploy to production

You'll see a URL like: `https://eko-ink-xxxxx.vercel.app`

### 4. Run Database Migrations

Once deployed, run these migrations in Supabase SQL Editor:

1. Go to https://supabase.com/dashboard/project/vszhsjpmlufjmmbswvov/sql
2. Run `migrations/003-add-intelligent-analysis.sql`
3. Run `migrations/004-add-api-keys-and-billing.sql`

### 5. Set Up Stripe Live Webhook

1. Copy your production URL from Vercel (e.g., `https://eko-ink-xxxxx.vercel.app`)
2. Go to https://dashboard.stripe.com (make sure you're in **Live mode**)
3. Navigate to **Developers > Webhooks**
4. Click **+ Add endpoint**
5. Enter endpoint URL: `https://your-production-url.vercel.app/api/stripe/webhook`
6. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.paid`
   - `invoice.payment_failed`
7. Click **Add endpoint**
8. Copy the **Signing secret** (starts with `whsec_`)
9. Go back to Vercel > Your Project > Settings > Environment Variables
10. Add `STRIPE_WEBHOOK_SECRET` with the value from step 8
11. Redeploy the app (Vercel > Deployments > ... > Redeploy)

### 6. Verify Production is Working

Test these features:

- [ ] Can log in at production URL
- [ ] Admin dashboard loads at `/dashboard/admin`
- [ ] Admin dashboard shows correct metrics
- [ ] Can view deals and notes
- [ ] Can purchase credits (test with real card - you can cancel/refund)
- [ ] Stripe webhook receives events (check Stripe Dashboard > Webhooks > Your endpoint > Events)

## 🎉 Post-Deployment

### Update Your Domain (Optional)

If you have a custom domain:
1. Go to Vercel > Your Project > Settings > Domains
2. Add your custom domain
3. Update Stripe webhook URL to use custom domain
4. Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables

### Monitor

- Check Vercel logs for errors
- Check Stripe Dashboard for successful payments
- Check Supabase Dashboard for database activity
- Monitor admin dashboard for revenue tracking

## 🔐 Security Notes

- Never commit `.env.local` to git (already in `.gitignore`)
- Keep your Stripe live keys secure
- Rotate API keys if exposed
- Monitor Stripe for unusual activity
- Set up Stripe fraud detection rules

## 📞 Troubleshooting

**Build fails:**
- Check Vercel deployment logs
- Verify all environment variables are set
- Check for TypeScript errors locally: `npm run build`

**Webhooks not working:**
- Verify webhook URL is correct
- Check webhook signing secret is set in Vercel
- View webhook events in Stripe Dashboard
- Check Vercel function logs

**Database errors:**
- Verify migrations were run
- Check Supabase connection string
- Verify service role key is correct
