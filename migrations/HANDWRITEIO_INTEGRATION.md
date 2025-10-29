# Handwrite.io Integration - Complete

## What Was Built

### 1. API Client (`/lib/handwriteio.ts`)
- Complete TypeScript wrapper for Handwrite.io API
- Handles authentication, sending letters, getting styles, and order tracking
- Includes validation for message length (320 char limit), state format, and zip code

### 2. Database Migration (`/migrations/add-handwriting-fields.sql`)
Run this SQL in your Supabase SQL editor:

```sql
ALTER TABLE notes
ADD COLUMN handwriteio_order_id TEXT,
ADD COLUMN handwriteio_status TEXT,
ADD COLUMN tracking_number TEXT,
ADD COLUMN estimated_delivery TIMESTAMP WITH TIME ZONE;
```

### 3. Send Note API Endpoint (`/app/api/notes/[noteId]/send/route.ts`)
- POST endpoint to send approved notes to Handwrite.io
- Validates note status (must be approved)
- Checks message length
- Extracts customer address from deal
- Creates Handwrite.io order
- Updates note with tracking info
- Logs event for analytics

### 4. UI Updates
**Note Editor Component:**
- Added "Send Handwritten Note" button for approved notes
- Shows confirmation dialog before sending
- Displays success message with order ID

**Note Detail Page:**
- Added "Order Tracking" card showing:
  - Order ID
  - Order status (processing, written, complete, etc.)
  - USPS tracking number
  - Estimated delivery date

## Environment Variables Added

```bash
# Handwrite.io
HANDWRITEIO_API_KEY=live_hw_6af124f7dba6bef4756d
# Default handwriting style ID (get from API)
HANDWRITEIO_DEFAULT_HANDWRITING_ID=2RQNELR6R000
# Default card ID (get from API)
HANDWRITEIO_DEFAULT_CARD_ID=SFPQPK676000
```

## Testing Checklist

### Before You Can Test:

1. **Run Database Migration**
   - Go to Supabase Dashboard → SQL Editor
   - Run the SQL from `migrations/add-handwriting-fields.sql`

2. **Get Handwriting Style and Card IDs**
   - Run: `npx ts-node --esm scripts/get-handwriteio-styles.ts`
   - This will show you all available styles and cards
   - Update `.env.local` with the IDs you want to use

3. **Ensure Test Data Has Complete Address**
   - Your deal must have `customer_address` JSONB with:
     - `street1` (required)
     - `city` (required)
     - `state` (required - 2 letter abbreviation like "CA")
     - `zip` (required - 5 digits)
     - `street2` (optional)
     - `company` (optional)

### End-to-End Test:

1. **Create a Deal** (via `/submit` form)
   - Include complete customer address
   - Upload call recording or provide MP3 URL

2. **Generate Note** (from `/dashboard/notes`)
   - Click "Generate Note" button
   - Wait for AI to generate the note

3. **Review & Approve** (from note detail page)
   - Edit if needed (must be under 320 characters!)
   - Click "Approve & Send"

4. **Send to Handwrite.io**
   - Click "Send Handwritten Note"
   - Confirm the dialog
   - Should see success message with Order ID

5. **Verify Tracking Info**
   - Page should refresh
   - Should see "Order Tracking" card with order ID
   - Status should be "processing"

6. **Check Handwrite.io Dashboard**
   - Log into https://app.handwrite.io
   - Verify order appears in your account

## Important Limitations

### Message Length
- **Hard limit: 320 characters** (Handwrite.io requirement)
- Current AI generates 60-80 words (usually ~350-450 characters)
- **You may need to edit notes to fit the limit!**
- Consider updating AI prompt to generate shorter notes (40-60 words)

### Address Requirements
- All fields must be present in `customer_address` JSONB
- State must be 2-letter abbreviation (e.g., "CA", not "California")
- Zip must be exactly 5 digits (no ZIP+4)
- No validation currently exists on the `/submit` form!

### Costs
- Each note costs money through Handwrite.io
- No cost estimation shown before sending
- No spending limits configured
- **Test carefully!**

## Next Steps / Improvements

### Critical (Do Before Production):
1. **Update AI Prompt** to generate shorter notes (40-60 words max)
2. **Add Address Validation** to `/submit` form
3. **Show Cost Estimate** before sending
4. **Add Spending Limits** to prevent runaway costs

### Nice to Have:
1. **Handwriting Style Selection** - Let users choose their preferred style
2. **Card Type Selection** - Choose different cards for different occasions
3. **Order Status Polling** - Automatically update order status from API
4. **Delivery Notifications** - Email user when note is delivered
5. **Test Mode** - Sandbox API for testing without real costs

## API Documentation

Handwrite.io API Docs: https://documentation.handwrite.io/

Key Endpoints:
- GET `/v1/handwritings` - List available styles
- GET `/v1/stationery` - List available cards
- POST `/v1/letters` - Send a letter
- GET `/v1/orders/{id}` - Get order status

Rate Limit: 60 requests/minute

## Troubleshooting

### "Message is too long"
- Edit the note to be under 320 characters
- Or update AI prompt to generate shorter notes

### "Customer address is incomplete"
- Check the deal's `customer_address` JSONB in Supabase
- Ensure all required fields are present

### "Handwrite.io API error"
- Check API key is correct in `.env.local`
- Verify account has credits/payment method
- Check Handwrite.io dashboard for issues

### "Note has already been sent"
- Each note can only be sent once
- Check `handwriteio_order_id` field - if populated, already sent
- Create a new note if you need to resend

## Integration Complete! 🎉

You now have a fully working handwritten note automation system:
1. Deal submitted → 2. AI generates note → 3. Rep approves → 4. Physical card mailed!

Remember to run the database migration and test with a small order first!
