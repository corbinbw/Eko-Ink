'use client';

import { useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClientConfig } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const supabaseConfig = useMemo(
    () => getSupabaseClientConfig({ allowUndefined: true, context: 'login page' }),
    []
  );

  const supabase = useMemo(() => {
    if (!supabaseConfig) {
      return null;
    }
    return createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey);
  }, [supabaseConfig]);

  const isDisabled = loading || !supabase;

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">EkoInk</h1>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">Sign in to your account</h2>
          {useMagicLink ? (
            <p className="mt-2 text-sm text-gray-600">
              We'll send you a magic link to sign in without a password
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-600">
              Enter your email and password to sign in
            </p>
          )}
        </div>

        {!supabaseConfig && (
          <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
            Supabase credentials are not configured for this deployment. Set the required environment
            variables before using the login form.
          </div>
        )}

        <form onSubmit={useMagicLink ? handleMagicLinkLogin : handlePasswordLogin} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="you@example.com"
              disabled={isDisabled}
            />
          </div>

          {!useMagicLink && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Enter your password"
                disabled={isDisabled}
              />
            </div>
          )}

          {message && (
            <div
              className={`rounded-md p-4 ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isDisabled}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (useMagicLink ? 'Sending...' : 'Signing in...') : (useMagicLink ? 'Send magic link' : 'Sign in')}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setUseMagicLink(!useMagicLink);
                setMessage(null);
                setPassword('');
              }}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              {useMagicLink ? 'Use password instead' : 'Use magic link instead'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
