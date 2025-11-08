import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-middleware';
import { getCurrentMonthUsage, getUsageHistory } from '@/lib/usage-tracker';

/**
 * GET /api/v1/account/usage
 * Get API usage for the account
 */
export async function GET(request: NextRequest) {
  return withApiAuth(
    request,
    async (req, context) => {
      try {
        // Get current month usage
        const currentMonth = await getCurrentMonthUsage(context.accountId);

        // Get usage history
        const url = new URL(req.url);
        const historyLimit = Math.min(parseInt(url.searchParams.get('history_limit') || '12'), 24);
        const history = await getUsageHistory(context.accountId, historyLimit);

        return apiSuccess({
          current_month: {
            cards_sent: currentMonth.cardsSent,
            api_calls: currentMonth.apiCalls,
            amount_owed_cents: currentMonth.amountOwed,
            amount_owed_usd: (currentMonth.amountOwed / 100).toFixed(2),
            monthly_limit: currentMonth.limit,
            remaining: Math.max(0, currentMonth.limit - currentMonth.cardsSent),
          },
          history: history.map((month) => ({
            year: month.year,
            month: month.month,
            cards_sent: month.cardsSent,
            amount_owed_cents: month.amountOwed,
            amount_owed_usd: (month.amountOwed / 100).toFixed(2),
            invoice_status: month.invoiceStatus,
            invoice_paid_at: month.invoicePaidAt,
          })),
          billing_info: {
            billing_type: context.account.billing_type,
            price_per_card_cents: 1000,
            price_per_card_usd: '10.00',
          },
        });
      } catch (error) {
        console.error('Error in GET /api/v1/account/usage:', error);
        return apiError('Internal server error', 500);
      }
    },
    {
      requiredScope: 'account:read',
    }
  );
}
