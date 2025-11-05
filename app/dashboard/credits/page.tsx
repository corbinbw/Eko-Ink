'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Tiered pricing function
function getPricePerCredit(credits: number): number {
  if (credits >= 500) return 4.45;
  if (credits >= 250) return 4.60;
  if (credits >= 100) return 4.75;
  return 4.99;
}

function calculateTotalPrice(credits: number): number {
  return credits * getPricePerCredit(credits);
}

export default function CreditsPage() {
  const [credits, setCredits] = useState(10);
  const [inputValue, setInputValue] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  // Fetch current credit balance
  useEffect(() => {
    async function fetchBalance() {
      try {
        const response = await fetch('/api/user/credits');
        if (response.ok) {
          const data = await response.json();
          setCurrentBalance(data.credits);
        }
      } catch (err) {
        console.error('Failed to fetch credit balance:', err);
      }
    }
    fetchBalance();
  }, []);

  const pricePerCredit = getPricePerCredit(credits);
  const totalPrice = calculateTotalPrice(credits);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setCredits(value);
    setInputValue(value.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1000) {
      setCredits(numValue);
    }
  };

  const handlePurchase = async () => {
    if (credits > 1000) {
      window.location.href = 'mailto:sales@ekoink.com?subject=Bulk Credit Purchase Request&body=I would like to purchase more than 1000 credits. Please contact me with pricing information.';
      return;
    }

    if (credits < 1) {
      setError('Please select at least 1 credit');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create checkout session with custom amount
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credits,
          customAmount: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700" style={{ backgroundColor: '#f8f7f2' }}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <img src="/ekoink-logo.png" alt="EkoInk" className="h-12 w-auto" />
              <h1 className="text-3xl font-serif font-bold text-royal-ink dark:text-gray-100 italic">EkoInk</h1>
            </Link>
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/notes" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors">
                Notes
              </Link>
              <Link href="/dashboard/credits" className="text-sm font-medium text-royal-ink dark:text-antique-gold">
                Credits
              </Link>
              <Link href="/dashboard/settings" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-royal-ink dark:text-gray-100 mb-2">Purchase Credits</h2>
          <p className="text-gray-600 dark:text-gray-400">
            You currently have <span className="font-semibold text-royal-ink dark:text-gray-100">{currentBalance !== null ? currentBalance : '...'}</span> credits remaining.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Credit Selector */}
        <div className="card-elegant">
          <div className="mb-6">
            <label className="block text-sm font-medium text-royal-ink dark:text-gray-100 mb-2">
              Number of credits
            </label>
            <input
              type="number"
              min="0"
              max="1000"
              value={inputValue}
              onChange={handleInputChange}
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-xl font-semibold text-royal-ink dark:text-gray-100 focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-1 focus:ring-royal-ink dark:focus:ring-antique-gold"
            />
          </div>

          {/* Slider */}
          <div className="mb-6">
            <input
              type="range"
              min="0"
              max="1000"
              step="1"
              value={credits}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1C2541 0%, #1C2541 ${(credits / 1000) * 100}%, #e5e7eb ${(credits / 1000) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>0</span>
              <span>250</span>
              <span>500</span>
              <span>750</span>
              <span>1000</span>
            </div>
          </div>

          {/* Pricing Display */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Price per credit:</span>
              <span className="text-xl font-semibold text-royal-ink dark:text-gray-100">${pricePerCredit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline mb-6">
              <span className="text-base font-medium text-royal-ink dark:text-gray-100">Total:</span>
              <span className="text-2xl font-bold text-royal-ink dark:text-gray-100">${totalPrice.toFixed(2)}</span>
            </div>

            {credits > 1000 && (
              <div className="mb-4 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  For orders over 1000 credits, please contact{' '}
                  <a href="mailto:sales@ekoink.com" className="font-medium underline">
                    sales@ekoink.com
                  </a>
                </p>
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={loading || credits < 1}
              className="w-full btn-gold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Processing...' : credits > 1000 ? 'Contact Sales' : `Purchase ${credits} Credit${credits !== 1 ? 's' : ''}`}
            </button>

            <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
              Coupon codes can be applied at checkout
            </p>
          </div>
        </div>

        {/* Pricing Tiers Info */}
        <div className="mt-6 card-elegant">
          <h3 className="mb-4 text-base font-semibold text-royal-ink dark:text-gray-100">Volume Pricing</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">1-99 credits</span>
              <span className="font-medium text-royal-ink dark:text-gray-100">$4.99</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">100-249 credits</span>
              <span className="font-medium text-royal-ink dark:text-gray-100">$4.75</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">250-499 credits</span>
              <span className="font-medium text-royal-ink dark:text-gray-100">$4.60</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">500-999 credits</span>
              <span className="font-medium text-royal-ink dark:text-gray-100">$4.45</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">1000+</span>
              <a href="mailto:sales@ekoink.com" className="font-medium text-royal-ink dark:text-antique-gold hover:text-royal-ink-600 dark:hover:text-antique-gold-600 underline">
                Contact us
              </a>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-6 card-elegant">
          <h3 className="mb-4 text-base font-semibold text-royal-ink dark:text-gray-100">FAQ</h3>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-royal-ink dark:text-gray-100">How do credits work?</h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Each credit allows you to send one handwritten note. Credits are deducted when your note is sent.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-royal-ink dark:text-gray-100">Do credits expire?</h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                No, credits never expire.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-royal-ink dark:text-gray-100">What payment methods?</h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                All major credit and debit cards via Stripe.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-royal-ink dark:text-gray-100">Refund policy?</h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Unused credits can be refunded within 30 days. Contact support.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
