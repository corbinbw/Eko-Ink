import { createBrowserClient } from '@supabase/ssr';

let cachedConfig: { url: string; anonKey: string } | null = null;

export async function getClientSupabaseConfig() {
  // First try to get from environment
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    return { url, anonKey };
  }

  // If not available, fetch from API (runtime config)
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const response = await fetch('/api/config');
    const config = await response.json();

    if (config.supabaseUrl && config.supabaseAnonKey) {
      cachedConfig = {
        url: config.supabaseUrl,
        anonKey: config.supabaseAnonKey,
      };
      return cachedConfig;
    }
  } catch (error) {
    console.error('Failed to fetch config:', error);
  }

  return null;
}

export async function createClientSupabase() {
  const config = await getClientSupabaseConfig();

  if (!config) {
    return null;
  }

  return createBrowserClient(config.url, config.anonKey);
}
