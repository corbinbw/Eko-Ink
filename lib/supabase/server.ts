import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseClientConfig, getSupabaseServiceRoleKey } from './config';

export async function createClient() {
  const cookieStore = await cookies();
  const config = getSupabaseClientConfig({
    context: 'lib/supabase/server.ts:createClient',
  });

  return createServerClient(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Service role client for admin operations (bypasses RLS)
export function createServiceClient() {
  const config = getSupabaseClientConfig({
    context: 'lib/supabase/server.ts:createServiceClient',
  });
  const serviceRoleKey = getSupabaseServiceRoleKey({
    context: 'lib/supabase/server.ts:createServiceClient',
  });

  return createSupabaseClient(
    config.url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
