import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';

// Lazy initialize Stripe to avoid build-time errors
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-09-30.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Get metadata
      const userId = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits || '0');

      if (!userId || !credits) {
        console.error('Missing metadata in session:', session.id);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // Add credits to user account
      const supabaseAdmin = createServiceClient();

      // Get user's account_id
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('account_id')
        .eq('id', userId)
        .single();

      if (!user) {
        console.error('User not found:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Get current credits from accounts table
      const { data: account } = await supabaseAdmin
        .from('accounts')
        .select('credits_remaining')
        .eq('id', user.account_id)
        .single();

      if (!account) {
        console.error('Account not found:', user.account_id);
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      const currentCredits = account.credits_remaining || 0;
      const newCredits = currentCredits + credits;

      // Update account credits
      const { error: updateError } = await supabaseAdmin
        .from('accounts')
        .update({ credits_remaining: newCredits })
        .eq('id', user.account_id);

      if (updateError) {
        console.error('Failed to update credits:', updateError);
        return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
      }

      // Create transaction record
      const { error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert({
          account_id: user.account_id,
          stripe_payment_intent_id: session.payment_intent as string,
          amount_cents: session.amount_total || 0,
          credits_added: credits,
          transaction_type: 'purchase',
          description: `Purchased ${credits} credit${credits !== 1 ? 's' : ''}`,
        });

      if (transactionError) {
        console.error('Failed to create transaction record:', transactionError);
        // Don't fail the webhook if transaction logging fails
      }

      console.log(`Added ${credits} credits to account ${user.account_id}. New balance: ${newCredits}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
