'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientSupabase, getClientSupabaseConfig } from '@/lib/supabase/client-config';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
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

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!supabase) {
      setMessage({
        type: 'error',
        text: 'Supabase is not configured. Please contact support.',
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to sign in',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!supabase) {
      setMessage({
        type: 'error',
        text: 'Supabase is not configured. Please contact support.',
      });
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Check your email for the login link!',
      });
      setEmail('');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send login link',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <h1 className="text-4xl font-serif font-bold text-royal-ink dark:text-gray-100 italic hover:text-antique-gold transition-colors">EkoInk</h1>
          </Link>
          <h2 className="mt-4 text-lg text-gray-600 dark:text-gray-400">Sign in to your account</h2>
        </div>

        {!supabase && !configLoading && (
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-300 mb-6 border border-yellow-200 dark:border-yellow-800">
            Supabase credentials are not configured for this deployment. Set the required environment
            variables before using the login form.
          </div>
        )}

        <form onSubmit={useMagicLink ? handleMagicLinkLogin : handlePasswordLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                disabled={isDisabled}
              />
            </div>

            {!useMagicLink && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter your password"
                  disabled={isDisabled}
                />
              </div>
            )}

            {message && (
              <div
                className={`rounded-md p-3 ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {useMagicLink ? 'Sending...' : 'Signing in...'}
                </span>
              ) : (
                useMagicLink ? 'Send magic link' : 'Sign in'
              )}
            </button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => {
                  setUseMagicLink(!useMagicLink);
                  setMessage(null);
                  setPassword('');
                }}
                className="text-sm text-antique-gold hover:text-antique-gold-600 font-medium transition-colors block mx-auto"
              >
                {useMagicLink ? 'Use password instead' : 'Use magic link instead'}
              </button>
              {!useMagicLink && (
                <button
                  type="button"
                  onClick={() => {
                    setUseMagicLink(true);
                    setMessage({ type: 'success', text: 'Enter your email to receive a password reset link' });
                  }}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-royal-ink dark:hover:text-antique-gold transition-colors block mx-auto"
                >
                  Forgot password?
                </button>
              )}
            </div>

          <div className="text-center text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
            <span className="text-gray-600 dark:text-gray-400">Don't have an account? </span>
            <Link href="/signup" className="font-medium text-royal-ink dark:text-antique-gold hover:text-royal-ink-600 dark:hover:text-antique-gold-600 transition-colors">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
