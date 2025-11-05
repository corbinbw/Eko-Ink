import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

// Lazy initialize Stripe to avoid build-time errors
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-09-30.clover',
  });
}

const CREDIT_PACKAGES = {
  single: {
    credits: 1,
    price: 500, // $5.00 in cents
    name: 'Single Note',
  },
  starter: {
    credits: 10,
    price: 3990, // $39.90 in cents
    name: 'Starter Pack - 10 Credits',
  },
  popular: {
    credits: 25,
    price: 7475, // $74.75 in cents
    name: 'Popular Pack - 25 Credits',
  },
  business: {
    credits: 50,
    price: 12450, // $124.50 in cents
    name: 'Business Pack - 50 Credits',
  },
  enterprise: {
    credits: 100,
    price: 19900, // $199.00 in cents
    name: 'Enterprise Pack - 100 Credits',
  },
};

// Helper function for tiered pricing
function getPricePerCredit(credits: number): number {
  if (credits >= 500) return 4.45;
  if (credits >= 250) return 4.60;
  if (credits >= 100) return 4.75;
  return 4.99;
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { packageId, customAmount, credits: customCredits } = body;

    let credits: number;
    let price: number;
    let name: string;

    // Handle custom amount (from slider)
    if (customAmount && customCredits) {
      credits = customCredits;
      const pricePerCredit = getPricePerCredit(credits);
      price = Math.round(credits * pricePerCredit * 100); // Convert to cents
      name = `${credits} Credit${credits !== 1 ? 's' : ''}`;
    } else {
      // Handle package selection (legacy support)
      const pkg = CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES];
      if (!pkg) {
        return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
      }
      credits = pkg.credits;
      price = pkg.price;
      name = pkg.name;
    }

    // Validate minimum purchase
    if (credits < 1) {
      return NextResponse.json({ error: 'Minimum purchase is 1 credit' }, { status: 400 });
    }

    // Create Stripe checkout session
    const stripe = getStripe();

    // Build session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: name,
              description: `Add ${credits} credit${credits !== 1 ? 's' : ''} to your account`,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits?canceled=true`,
      customer_email: authUser.email || undefined,
      metadata: {
        userId: authUser.id,
        credits: credits.toString(),
      },
      allow_promotion_codes: true,
    };

    console.log('Creating Stripe session with config:', {
      credits,
      price,
      allow_promotion_codes: sessionConfig.allow_promotion_codes,
    });

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('Stripe session created:', session.id);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
