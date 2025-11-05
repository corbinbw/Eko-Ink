'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function CreditsSuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Process the payment on the client side as backup for webhook
    const processPayment = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        // Call an API route to process the session and add credits
        const response = await fetch('/api/stripe/process-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to process payment');
        }

        // Give it a moment then stop loading
        setTimeout(() => setLoading(false), 1000);
      } catch (err: any) {
        console.error('Error processing payment:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    processPayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-antique-gold border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <img src="/ekoink-logo.png" alt="EkoInk" className="h-8 w-auto" />
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
        <div className="card-elegant text-center">
          {/* Success Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <svg
              className="h-10 w-10 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="mt-6 text-3xl font-serif font-bold text-royal-ink dark:text-gray-100">Payment Successful!</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Your credits have been added to your account. You can now start sending handwritten notes.
          </p>

          {sessionId && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Transaction ID: {sessionId.slice(-12)}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="btn-gold"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/dashboard/new-note"
              className="inline-flex items-center justify-center rounded-md bg-white dark:bg-gray-700 px-6 py-3 text-sm font-semibold text-royal-ink dark:text-gray-100 shadow-sm ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Send a Note
            </Link>
          </div>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h3 className="text-sm font-medium text-royal-ink dark:text-gray-100">What's next?</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>✓ Credits have been added to your account</li>
              <li>✓ You'll receive a confirmation email shortly</li>
              <li>✓ Start creating and sending notes right away</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CreditsSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-antique-gold border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading payment status...</p>
          </div>
        </div>
      }
    >
      <CreditsSuccessPageContent />
    </Suspense>
  );
}
