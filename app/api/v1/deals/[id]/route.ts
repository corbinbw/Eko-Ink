import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-middleware';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/deals/:id
 * Get details for a specific deal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiAuth(
    request,
    async (req, context, routeParams) => {
      const { id } = await routeParams.params;
      const supabase = createServiceClient();

      try {
        // Fetch deal with related data
        const { data: deal, error } = await supabase
          .from('deals')
          .select(
            `
            id,
            customer_first_name,
            customer_last_name,
            customer_address,
            product_name,
            deal_value,
            closed_at,
            personal_detail,
            created_at,
            calls (
              id,
              mp3_url,
              duration_seconds,
              transcript,
              transcript_status,
              transcribed_at
            ),
            notes (
              id,
              draft_text,
              final_text,
              status,
              requires_approval,
              handwriteio_order_id,
              tracking_number,
              estimated_delivery,
              created_at,
              approved_at,
              sent_at,
              delivered_at
            )
          `
          )
          .eq('id', id)
          .eq('account_id', context.accountId)
          .single();

        if (error || !deal) {
          return apiError('Deal not found', 404);
        }

        return apiSuccess({
          deal,
        });
      } catch (error) {
        console.error('Error in GET /api/v1/deals/:id:', error);
        return apiError('Internal server error', 500);
      }
    },
    {
      requiredScope: 'deals:read',
      params: { params },
    }
  );
}
