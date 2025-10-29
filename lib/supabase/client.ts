import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseClientConfig } from './config';

export function createClient() {
  const config = getSupabaseClientConfig({
    context: 'lib/supabase/client.ts',
  });

  return createBrowserClient(config.url, config.anonKey);
}
