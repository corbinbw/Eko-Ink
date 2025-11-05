'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClientSupabase } from '@/lib/supabase/client-config';

export const dynamic = 'force-dynamic';

type UserRole = 'rep' | 'manager' | 'executive';

export default function SignupPage() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('code');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    companyName: '',
    role: (inviteCode ? 'rep' : 'manager') as UserRole,
    inviteCode: inviteCode || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [supabase, setSupabase] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function initSupabase() {
      const client = await createClientSupabase();
      setSupabase(client);
      setConfigLoading(false);
    }
    initSupabase();
  }, []);

  const isDisabled = loading || !supabase || configLoading;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!supabase) {
      setMessage({
        type: 'error',
        text: 'Supabase is not configured. Please contact support.',
      });
      setLoading(false);
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Passwords do not match',
      });
      setLoading(false);
      return;
    }

    // Validate password strength (minimum 6 characters)
    if (formData.password.length < 6) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 6 characters long',
      });
      setLoading(false);
      return;
    }

    try {
      // If using invite code, validate it first
      if (formData.inviteCode) {
        const validateResponse = await fetch('/api/invites/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: formData.inviteCode }),
        });

        if (!validateResponse.ok) {
          const data = await validateResponse.json();
          throw new Error(data.error || 'Invalid invite code');
        }
      }

      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            company_name: formData.companyName,
            role: formData.role,
            invite_code: formData.inviteCode || null,
          },
        },
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Account created! Redirecting to dashboard...',
      });

      // Redirect to dashboard after successful signup
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to create account',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-royal-ink dark:text-gray-100 italic">EkoInk</h1>
          <h2 className="mt-4 text-lg font-semibold text-royal-ink dark:text-gray-100">Create your account</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Start sending handwritten thank-you notes today
          </p>
        </div>

        {!supabase && !configLoading && (
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300 mb-6 border border-yellow-200 dark:border-yellow-800">
            Supabase credentials are not configured for this deployment. Set the required environment
            variables before using the signup form.
          </div>
        )}

        <div className="card-elegant">
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Your name
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink focus:outline-none focus:ring-royal-ink"
                placeholder="John Doe"
                disabled={isDisabled}
              />
            </div>

            {!inviteCode && (
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Company name
                </label>
                <input
                  id="company"
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink focus:outline-none focus:ring-royal-ink"
                  placeholder="Acme Inc"
                  disabled={isDisabled}
                />
              </div>
            )}

            {!inviteCode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  What's your role?
                </label>
                <div className="space-y-3">
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.role === 'rep'
                        ? 'border-royal-ink dark:border-antique-gold bg-royal-ink/5 dark:bg-antique-gold/10'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    onClick={() => setFormData({ ...formData, role: 'rep' })}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        checked={formData.role === 'rep'}
                        onChange={() => setFormData({ ...formData, role: 'rep' })}
                        className="mt-1 text-royal-ink focus:ring-royal-ink dark:text-antique-gold dark:focus:ring-antique-gold"
                        disabled={isDisabled}
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">Individual Rep</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          I'm a sales rep using EkoInk for my own notes
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.role === 'manager'
                        ? 'border-royal-ink dark:border-antique-gold bg-royal-ink/5 dark:bg-antique-gold/10'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    onClick={() => setFormData({ ...formData, role: 'manager' })}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        checked={formData.role === 'manager'}
                        onChange={() => setFormData({ ...formData, role: 'manager' })}
                        className="mt-1 text-royal-ink focus:ring-royal-ink dark:text-antique-gold dark:focus:ring-antique-gold"
                        disabled={isDisabled}
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">Team Manager</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          I manage a sales team and want to invite my reps
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.role === 'executive'
                        ? 'border-royal-ink dark:border-antique-gold bg-royal-ink/5 dark:bg-antique-gold/10'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    onClick={() => setFormData({ ...formData, role: 'executive' })}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        checked={formData.role === 'executive'}
                        onChange={() => setFormData({ ...formData, role: 'executive' })}
                        className="mt-1 text-royal-ink focus:ring-royal-ink dark:text-antique-gold dark:focus:ring-antique-gold"
                        disabled={isDisabled}
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">Company Executive</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          I oversee multiple teams and managers
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {inviteCode && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  You're joining a team with invite code: <span className="font-mono font-semibold">{inviteCode}</span>
                </p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink focus:outline-none focus:ring-royal-ink"
                placeholder="you@company.com"
                disabled={isDisabled}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink focus:outline-none focus:ring-royal-ink"
                placeholder="Minimum 6 characters"
                disabled={isDisabled}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink focus:outline-none focus:ring-royal-ink"
                placeholder="Re-enter your password"
                disabled={isDisabled}
              />
            </div>

            {message && (
              <div
                className={`rounded-md p-4 ${
                  message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <div className="text-center text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
              <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
              <Link href="/login" className="font-medium text-royal-ink dark:text-antique-gold hover:text-royal-ink-600 dark:hover:text-antique-gold-600 transition-colors">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
