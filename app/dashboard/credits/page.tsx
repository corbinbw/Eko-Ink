'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import Link from 'next/link';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 10,
    price: 29.99,
    description: 'Perfect for trying out the service',
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    credits: 25,
    price: 69.99,
    description: 'Best value for regular users',
    popular: true,
  },
  {
    id: 'business',
    name: 'Business Pack',
    credits: 50,
    price: 129.99,
    description: 'Ideal for businesses',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    credits: 100,
    price: 229.99,
    description: 'For high-volume needs',
  },
];

export default function CreditsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId);
    setError(null);

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw stripeError;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Add Credits</h1>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Choose Your Credit Package</h2>
          <p className="mt-2 text-gray-600">
            Select the package that best fits your needs. Credits never expire.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Credit Packages Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-lg bg-white p-6 shadow-md ${
                pkg.popular ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                  <span className="inline-flex rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{pkg.description}</p>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">${pkg.price}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{pkg.credits} Credits</p>
                <p className="text-xs text-gray-500">
                  ${(pkg.price / pkg.credits).toFixed(2)} per credit
                </p>
              </div>

              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={loading !== null}
                className={`w-full rounded-md px-4 py-2 text-sm font-semibold text-white shadow transition ${
                  pkg.popular
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-800 hover:bg-gray-900'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {loading === pkg.id ? 'Processing...' : 'Purchase'}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-12 rounded-lg bg-white p-8 shadow">
          <h3 className="mb-6 text-xl font-semibold text-gray-900">Frequently Asked Questions</h3>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900">How do credits work?</h4>
              <p className="mt-1 text-sm text-gray-600">
                Each credit allows you to send one handwritten note. Credits are deducted when your note is approved and sent.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">Do credits expire?</h4>
              <p className="mt-1 text-sm text-gray-600">
                No, credits never expire. Use them whenever you need them.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">What payment methods do you accept?</h4>
              <p className="mt-1 text-sm text-gray-600">
                We accept all major credit cards, debit cards, and digital wallets through Stripe.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">Can I get a refund?</h4>
              <p className="mt-1 text-sm text-gray-600">
                Unused credits can be refunded within 30 days of purchase. Contact support for assistance.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
