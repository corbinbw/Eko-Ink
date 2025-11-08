import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/overview
 * Get overview of all accounts, users, and API usage
 * Only accessible by admin accounts (where accounts.is_admin = true)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createServiceClient();

    // Check authentication
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        account_id,
        accounts!inner (
          is_admin
        )
      `)
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const account = Array.isArray(user.accounts) ? user.accounts[0] : user.accounts;
    if (!(account as any)?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all accounts with stats
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select(`
        id,
        company_name,
        billing_type,
        credits_remaining,
        api_monthly_limit,
        stripe_customer_id,
        stripe_payment_method_id,
        webhook_url,
        is_admin,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    // Fetch all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, account_id, email, name, role, notes_sent_count, learning_complete, created_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Fetch all API keys
    const { data: apiKeys, error: keysError } = await supabaseAdmin
      .from('api_keys')
      .select('id, account_id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at')
      .order('created_at', { ascending: false });

    if (keysError) {
      console.error('Error fetching API keys:', keysError);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    // Fetch current month's API usage for all accounts
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const { data: currentUsage, error: usageError } = await supabaseAdmin
      .from('api_usage')
      .select('account_id, cards_sent, api_calls_count, amount_owed_cents')
      .eq('year', currentYear)
      .eq('month', currentMonth);

    if (usageError) {
      console.error('Error fetching usage:', usageError);
    }

    // =====================================================
    // CALCULATE BUSINESS METRICS
    // =====================================================

    // 1. TOTAL REVENUE (credits purchased + API invoices paid)
    const { data: transactions } = await supabaseAdmin
      .from('transactions')
      .select('amount_cents, transaction_type');

    const creditRevenue = (transactions || [])
      .filter((t) => t.transaction_type === 'purchase')
      .reduce((sum, t) => sum + t.amount_cents, 0);

    const { data: paidInvoices } = await supabaseAdmin
      .from('api_usage')
      .select('amount_owed_cents')
      .eq('invoice_status', 'paid');

    const apiRevenue = (paidInvoices || []).reduce((sum, i) => sum + i.amount_owed_cents, 0);
    const totalRevenue = creditRevenue + apiRevenue;

    // 2. CARDS SENT THIS MONTH
    const { count: cardsSentThisMonth } = await supabaseAdmin
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['sent', 'delivered'])
      .gte('sent_at', new Date(currentYear, currentMonth - 1, 1).toISOString())
      .lt('sent_at', new Date(currentYear, currentMonth, 1).toISOString());

    // 3. ACTIVE PAYING CUSTOMERS (credits > 0 OR sent card in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentActivity } = await supabaseAdmin
      .from('notes')
      .select('deals!inner(account_id)')
      .in('status', ['sent', 'delivered'])
      .gte('sent_at', thirtyDaysAgo.toISOString());

    const activeAccountIds = new Set([
      ...(accounts || []).filter((a) => a.credits_remaining > 0).map((a) => a.id),
      ...(recentActivity || []).map((n: any) => n.deals.account_id),
    ]);

    const activePayingCustomers = activeAccountIds.size;

    // 4. MONTHLY RECURRING REVENUE (API accounts × average monthly usage × $10)
    const { data: apiUsageLast3Months } = await supabaseAdmin
      .from('api_usage')
      .select('account_id, cards_sent')
      .gte('year', currentYear)
      .gte('month', Math.max(1, currentMonth - 2));

    const apiAccountUsage = new Map();
    (apiUsageLast3Months || []).forEach((usage) => {
      if (!apiAccountUsage.has(usage.account_id)) {
        apiAccountUsage.set(usage.account_id, []);
      }
      apiAccountUsage.get(usage.account_id).push(usage.cards_sent);
    });

    let totalMRR = 0;
    apiAccountUsage.forEach((months) => {
      const avgCards = months.reduce((sum: number, cards: number) => sum + cards, 0) / months.length;
      totalMRR += avgCards * 1000; // $10 per card
    });

    // 5. NOTE APPROVAL RATE (% of generated notes that get approved)
    const { count: totalNotes } = await supabaseAdmin
      .from('notes')
      .select('*', { count: 'exact', head: true });

    const { count: approvedNotes } = await supabaseAdmin
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['approved', 'sent', 'delivered']);

    const approvalRate = totalNotes ? Math.round((approvedNotes! / totalNotes) * 100) : 0;

    // 6. FAILED GENERATIONS (notes that failed to generate)
    const { count: failedNotes } = await supabaseAdmin
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    // 7. NEW ACCOUNTS THIS MONTH
    const { count: newAccountsThisMonth } = await supabaseAdmin
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(currentYear, currentMonth - 1, 1).toISOString())
      .lt('created_at', new Date(currentYear, currentMonth, 1).toISOString());

    // 8. AVERAGE CARDS PER CUSTOMER
    const { count: totalCardsSent } = await supabaseAdmin
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['sent', 'delivered']);

    const avgCardsPerCustomer =
      activePayingCustomers > 0 ? (totalCardsSent! / activePayingCustomers).toFixed(1) : '0.0';

    // Build usage map
    const usageMap = new Map(
      (currentUsage || []).map((u) => [
        u.account_id,
        {
          cardsSent: u.cards_sent,
          apiCalls: u.api_calls_count,
          amountOwed: u.amount_owed_cents,
        },
      ])
    );

    // Combine data
    const accountsWithDetails = accounts?.map((acc) => ({
      ...acc,
      userCount: users?.filter((u) => u.account_id === acc.id).length || 0,
      apiKeyCount: apiKeys?.filter((k) => k.account_id === acc.id && !k.revoked_at).length || 0,
      currentMonthUsage: usageMap.get(acc.id) || { cardsSent: 0, apiCalls: 0, amountOwed: 0 },
    }));

    return NextResponse.json({
      success: true,
      data: {
        accounts: accountsWithDetails,
        users,
        apiKeys,
        stats: {
          // NEW METRICS - Actually useful for business
          totalRevenue, // in cents
          cardsSentThisMonth: cardsSentThisMonth || 0,
          activePayingCustomers,
          monthlyRecurringRevenue: Math.round(totalMRR), // in cents
          approvalRate, // percentage
          failedGenerations: failedNotes || 0,
          newAccountsThisMonth: newAccountsThisMonth || 0,
          avgCardsPerCustomer,

          // KEEP THESE - Still useful
          totalApiKeys: apiKeys?.filter((k) => !k.revoked_at).length || 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
