import crypto from 'crypto';
import { createServiceClient } from './supabase/server';

export interface ApiKey {
  id: string;
  account_id: string;
  user_id: string | null;
  key_prefix: string;
  name: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ApiKeyValidation {
  valid: boolean;
  apiKey?: ApiKey & {
    account: {
      id: string;
      company_name: string;
      billing_type: string;
      api_monthly_limit: number;
    };
  };
  error?: string;
}

/**
 * Generate a new API key
 * Returns the full key (show once!) and the hashed version to store
 */
export function generateApiKey(type: 'live' | 'test' = 'live'): {
  key: string; // Show to user once
  prefix: string; // Store in DB
  hash: string; // Store in DB
} {
  const prefix = type === 'live' ? 'sk_live_' : 'sk_test_';

  // Generate 32 random bytes (256 bits)
  const randomBytes = crypto.randomBytes(32).toString('base64url');
  const key = `${prefix}${randomBytes}`;

  // Hash for storage (never store plaintext!)
  const hash = hashApiKey(key);

  return { key, prefix, hash };
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate an API key and return associated account data
 */
export async function validateApiKey(key: string): Promise<ApiKeyValidation> {
  if (!key) {
    return { valid: false, error: 'API key is required' };
  }

  // Check format
  if (!key.startsWith('sk_live_') && !key.startsWith('sk_test_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const hash = hashApiKey(key);
  const supabase = createServiceClient();

  try {
    // Look up key with account data
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .select(`
        *,
        account:accounts!inner (
          id,
          company_name,
          billing_type,
          api_monthly_limit
        )
      `)
      .eq('key_hash', hash)
      .is('revoked_at', null)
      .single();

    if (error || !apiKey) {
      return { valid: false, error: 'Invalid or revoked API key' };
    }

    // Check if expired
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Update last_used_at (fire and forget)
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id)
      .then(() => {})
      .catch((err) => console.error('Failed to update last_used_at:', err));

    return {
      valid: true,
      apiKey: apiKey as any,
    };
  } catch (error) {
    console.error('Error validating API key:', error);
    return { valid: false, error: 'Internal error validating API key' };
  }
}

/**
 * Check if an account has permission for a specific scope
 */
export function hasScope(scopes: string[], requiredScope: string): boolean {
  // Check for wildcard
  if (scopes.includes('*')) return true;

  // Check for exact match
  if (scopes.includes(requiredScope)) return true;

  // Check for resource wildcard (e.g., 'deals:*' covers 'deals:create')
  const [resource] = requiredScope.split(':');
  if (scopes.includes(`${resource}:*`)) return true;

  return false;
}

/**
 * Check if account is within monthly usage limit
 */
export async function checkMonthlyLimit(accountId: string): Promise<{
  withinLimit: boolean;
  usage: number;
  limit: number;
}> {
  const supabase = createServiceClient();

  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  // Get current month's usage
  const { data: usage } = await supabase
    .from('api_usage')
    .select('cards_sent')
    .eq('account_id', accountId)
    .eq('year', year)
    .eq('month', month)
    .single();

  // Get account limit
  const { data: account } = await supabase
    .from('accounts')
    .select('api_monthly_limit')
    .eq('id', accountId)
    .single();

  const currentUsage = usage?.cards_sent || 0;
  const limit = account?.api_monthly_limit || 100;

  return {
    withinLimit: currentUsage < limit,
    usage: currentUsage,
    limit,
  };
}

/**
 * Create a new API key
 */
export async function createApiKey(params: {
  accountId: string;
  userId: string;
  name: string;
  scopes?: string[];
  type?: 'live' | 'test';
  expiresAt?: Date | null;
}): Promise<{ success: true; key: string; apiKeyId: string } | { success: false; error: string }> {
  const supabase = createServiceClient();

  const { key, prefix, hash } = generateApiKey(params.type || 'live');

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      account_id: params.accountId,
      user_id: params.userId,
      key_prefix: prefix,
      key_hash: hash,
      name: params.name,
      scopes: params.scopes || ['deals:create', 'deals:read', 'notes:read', 'notes:write', 'notes:send'],
      expires_at: params.expiresAt?.toISOString() || null,
      created_by: params.userId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating API key:', error);
    return { success: false, error: 'Failed to create API key' };
  }

  return {
    success: true,
    key, // Return plaintext key (only time it's visible!)
    apiKeyId: data.id,
  };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  apiKeyId: string,
  revokedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('api_keys')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
    })
    .eq('id', apiKeyId);

  if (error) {
    console.error('Error revoking API key:', error);
    return { success: false, error: 'Failed to revoke API key' };
  }

  return { success: true };
}

/**
 * List API keys for an account
 */
export async function listApiKeys(accountId: string): Promise<ApiKey[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing API keys:', error);
    return [];
  }

  return data as ApiKey[];
}
