import { createServiceClient } from './supabase/server';

/**
 * Track API usage for monthly billing
 */
export async function trackApiUsage(params: {
  accountId: string;
  cardsSent?: number;
  apiCalls?: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  try {
    // Call the database function to increment usage
    const { error } = await supabase.rpc('increment_api_usage', {
      p_account_id: params.accountId,
      p_cards_sent: params.cardsSent || 0,
      p_api_calls: params.apiCalls || 1,
    });

    if (error) {
      console.error('Error tracking API usage:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error tracking API usage:', error);
    return { success: false, error: 'Failed to track usage' };
  }
}

/**
 * Get current month's usage for an account
 */
export async function getCurrentMonthUsage(accountId: string): Promise<{
  cardsSent: number;
  apiCalls: number;
  amountOwed: number; // in cents
  limit: number;
}> {
  const supabase = createServiceClient();

  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  // Get usage
  const { data: usage } = await supabase
    .from('api_usage')
    .select('cards_sent, api_calls_count, amount_owed_cents')
    .eq('account_id', accountId)
    .eq('year', year)
    .eq('month', month)
    .single();

  // Get limit
  const { data: account } = await supabase
    .from('accounts')
    .select('api_monthly_limit')
    .eq('id', accountId)
    .single();

  return {
    cardsSent: usage?.cards_sent || 0,
    apiCalls: usage?.api_calls_count || 0,
    amountOwed: usage?.amount_owed_cents || 0,
    limit: account?.api_monthly_limit || 100,
  };
}

/**
 * Get usage history for an account
 */
export async function getUsageHistory(
  accountId: string,
  limit: number = 12
): Promise<
  Array<{
    year: number;
    month: number;
    cardsSent: number;
    amountOwed: number;
    invoiceStatus: string;
    invoicePaidAt: string | null;
  }>
> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('api_usage')
    .select('year, month, cards_sent, amount_owed_cents, invoice_status, invoice_paid_at')
    .eq('account_id', accountId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching usage history:', error);
    return [];
  }

  return (data || []).map((row) => ({
    year: row.year,
    month: row.month,
    cardsSent: row.cards_sent,
    amountOwed: row.amount_owed_cents,
    invoiceStatus: row.invoice_status,
    invoicePaidAt: row.invoice_paid_at,
  }));
}

/**
 * Check if account has exceeded monthly limit
 */
export async function hasExceededLimit(accountId: string): Promise<boolean> {
  const usage = await getCurrentMonthUsage(accountId);
  return usage.cardsSent >= usage.limit;
}

/**
 * Get total revenue from API usage
 */
export async function getTotalApiRevenue(): Promise<number> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('api_usage')
    .select('amount_owed_cents')
    .eq('invoice_status', 'paid');

  if (error) {
    console.error('Error fetching total revenue:', error);
    return 0;
  }

  return (data || []).reduce((sum, row) => sum + row.amount_owed_cents, 0);
}
