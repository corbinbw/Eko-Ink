'use client';

import { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  amount_cents: number;
  credits_added: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export default function PaymentHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const response = await fetch('/api/user/transactions');
        if (!response.ok) {
          throw new Error('Failed to fetch transaction history');
        }
        const data = await response.json();
        setTransactions(data.transactions);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="card-elegant">
        <h3 className="text-lg font-semibold text-royal-ink dark:text-gray-100 mb-4">Payment History</h3>
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-antique-gold border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-elegant">
        <h3 className="text-lg font-semibold text-royal-ink dark:text-gray-100 mb-4">Payment History</h3>
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elegant">
      <h3 className="text-lg font-semibold text-royal-ink dark:text-gray-100 mb-4">Payment History</h3>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No transactions yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your payment history will appear here once you make a purchase.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Credits
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {new Date(transaction.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {transaction.description}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        +{transaction.credits_added}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                      ${(transaction.amount_cents / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {transactions.length >= 50 && (
            <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Showing most recent 50 transactions
            </div>
          )}
        </div>
      )}
    </div>
  );
}
