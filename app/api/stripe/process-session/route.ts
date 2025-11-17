import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// Lazy initialize Stripe to avoid build-time errors
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-10-29.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createServiceClient();

    // Check authentication
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Retrieve the session from Stripe
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify the session is complete and paid
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Get metadata
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || '0');

    if (!userId || !credits) {
      console.error('Missing metadata:', { userId, credits, session_id: sessionId });
      return NextResponse.json(
        { error: 'Invalid session metadata' },
        { status: 400 }
      );
    }

    // Verify the user making the request matches the session
    if (userId !== authUser.id) {
      console.error('User ID mismatch:', { userId, authUserId: authUser.id });
      return NextResponse.json(
        { error: 'Session does not belong to this user' },
        { status: 403 }
      );
    }

    // Get user's account_id (query by email, not id, as users table uses auto-generated ids)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('account_id, id')
      .eq('email', authUser.email)
      .single();

    if (!user || userError) {
      console.error('User not found:', { email: authUser.email, error: userError });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get current credits from accounts table
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('credits_remaining')
      .eq('id', user.account_id)
      .single();

    if (!account) {
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
      return NextResponse.json(
        { error: 'Failed to update credits' },
        { status: 500 }
      );
    }

    // Create transaction record
    const { data: transactionData, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        account_id: user.account_id,
        stripe_payment_intent_id: session.payment_intent as string,
        amount_cents: session.amount_total || 0,
        credits_added: credits,
        transaction_type: 'purchase',
        description: `Purchased ${credits} credit${credits !== 1 ? 's' : ''}`,
      })
      .select();

    if (transactionError) {
      console.error('Failed to create transaction record:', {
        error: transactionError,
        account_id: user.account_id,
        payment_intent: session.payment_intent,
        amount: session.amount_total,
        credits,
      });
      // Don't fail the request if transaction logging fails
    } else {
      console.log('Transaction record created:', transactionData);
    }

    console.log(
      `Added ${credits} credits to account ${user.account_id}. New balance: ${newCredits} (via client-side processing)`
    );

    return NextResponse.json({
      success: true,
      credits_added: credits,
      new_balance: newCredits,
    });
  } catch (error: any) {
    console.error('Process session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process session' },
      { status: 500 }
    );
  }
}
