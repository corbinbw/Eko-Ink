type SupabaseClientConfig = {
  url: string;
  anonKey: string;
};

type SupabaseConfigOptions = {
  allowUndefined?: boolean;
  context?: string;
};

function resolveEnvValue(possibleKeys: string[]) {
  for (const key of possibleKeys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return undefined;
}

function buildMissingEnvMessage(keys: string[], context?: string) {
  return [
    'Missing Supabase environment variables:',
    `Expected one of ${keys.join(', ')}`,
    context ? `Context: ${context}` : undefined,
  ]
    .filter(Boolean)
    .join(' ');
}

export function getSupabaseClientConfig(
  options?: SupabaseConfigOptions & { allowUndefined?: false }
): SupabaseClientConfig;
export function getSupabaseClientConfig(
  options: SupabaseConfigOptions & { allowUndefined: true }
): SupabaseClientConfig | null;
export function getSupabaseClientConfig(
  options?: SupabaseConfigOptions
): SupabaseClientConfig | null {
  const url = resolveEnvValue(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']);
  const anonKey = resolveEnvValue(['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']);

  if (!url || !anonKey) {
    if (options?.allowUndefined) {
      return null;
    }
    throw new Error(buildMissingEnvMessage(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'], options?.context));
  }

  return { url, anonKey };
}

export function getSupabaseServiceRoleKey(
  options?: SupabaseConfigOptions & { allowUndefined?: false }
): string;
export function getSupabaseServiceRoleKey(
  options: SupabaseConfigOptions & { allowUndefined: true }
): string | null;
export function getSupabaseServiceRoleKey(options?: SupabaseConfigOptions): string | null {
  const serviceRoleKey = resolveEnvValue([
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  ]);

  if (!serviceRoleKey) {
    if (options?.allowUndefined) {
      return null;
    }
    throw new Error(buildMissingEnvMessage(
      ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'],
      options?.context,
    ));
  }

  return serviceRoleKey;
}
