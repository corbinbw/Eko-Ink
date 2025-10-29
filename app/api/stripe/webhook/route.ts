import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
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

      // Get current credits
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (!user) {
        console.error('User not found:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const currentCredits = user.credits || 0;
      const newCredits = currentCredits + credits;

      // Update user credits
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ credits: newCredits })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update credits:', updateError);
        return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
      }

      console.log(`Added ${credits} credits to user ${userId}. New balance: ${newCredits}`);
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
