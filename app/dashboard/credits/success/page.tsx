'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CreditsSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Give webhook a moment to process
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Payment Successful</h1>
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
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-12 text-center shadow">
          {/* Success Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-10 w-10 text-green-600"
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

          <h2 className="mt-6 text-3xl font-bold text-gray-900">Payment Successful!</h2>
          <p className="mt-4 text-gray-600">
            Your credits have been added to your account. You can now start sending handwritten notes.
          </p>

          {sessionId && (
            <p className="mt-2 text-sm text-gray-500">
              Transaction ID: {sessionId.slice(-12)}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/dashboard/new-note"
              className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow ring-1 ring-gray-300 hover:bg-gray-50"
            >
              Send a Note
            </Link>
          </div>

          <div className="mt-8 border-t pt-8">
            <h3 className="text-sm font-medium text-gray-900">What's next?</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
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
