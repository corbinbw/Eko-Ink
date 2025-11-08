import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-middleware';
import { createServiceClient } from '@/lib/supabase/server';
import { trackApiUsage } from '@/lib/usage-tracker';
import { handwriteIO } from '@/lib/handwriteio';

/**
 * POST /api/v1/notes/:id/send
 * Send an approved note to Handwrite.io
 * This is the billable action - tracks usage and doesn't charge credits
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiAuth(
    request,
    async (req, context, routeParams) => {
      const { id } = await routeParams.params;
      const supabase = createServiceClient();

      try {
        // Fetch note with full deal data
        const { data: note, error: noteError } = await supabase
          .from('notes')
          .select(`
            *,
            deals!inner (
              id,
              account_id,
              customer_first_name,
              customer_last_name,
              customer_address
            )
          `)
          .eq('id', id)
          .single();

        if (noteError || !note) {
          return apiError('Note not found', 404);
        }

        // Check account access
        const deal = note.deals as any;
        if (deal.account_id !== context.accountId) {
          return apiError('Note not found', 404);
        }

        // Verify note is approved
        if (note.status !== 'approved') {
          return apiError('Note must be approved before sending. Use POST /api/v1/notes/:id/approve first.', 400);
        }

        // Check if already sent
        if (note.handwriteio_order_id) {
          return apiError('Note has already been sent', 400);
        }

        // Get final text
        const message = note.draft_text || note.final_text;
        if (!message) {
          return apiError('Note has no text to send', 400);
        }

        // Validate message length
        if (message.length > 320) {
          return apiError(
            `Message is too long (${message.length} characters). Maximum is 320 characters.`,
            400
          );
        }

        // Parse customer address
        const customerAddress = deal.customer_address;

        // Support both naming conventions
        const line1 = customerAddress?.line1 || customerAddress?.street1;
        const line2 = customerAddress?.line2 || customerAddress?.street2;
        const postalCode = customerAddress?.postal_code || customerAddress?.zip;

        if (!customerAddress || !line1 || !customerAddress.city || !customerAddress.state || !postalCode) {
          return apiError('Customer address is incomplete', 400);
        }

        // Get handwriting defaults
        const handwriting_id = process.env.HANDWRITEIO_DEFAULT_HANDWRITING_ID || 'default';
        const card_id = process.env.HANDWRITEIO_DEFAULT_CARD_ID || 'default';

        try {
          // Send to Handwrite.io
          const result = await handwriteIO.sendLetter({
            message,
            handwriting_id,
            card_id,
            recipient: {
              firstName: deal.customer_first_name,
              lastName: deal.customer_last_name,
              company: customerAddress.company,
              street1: line1,
              street2: line2,
              city: customerAddress.city,
              state: customerAddress.state,
              zip: postalCode,
            },
          });

          // Track usage for monthly billing (THIS IS THE BILLABLE EVENT)
          await trackApiUsage({
            accountId: context.accountId,
            cardsSent: 1,
          });

          // Update note with order information
          const { error: updateError } = await supabase
            .from('notes')
            .update({
              status: 'sent',
              handwriteio_order_id: result.order_id,
              handwriteio_status: result.status,
              tracking_number: result.tracking_number,
              estimated_delivery: result.estimated_delivery,
              sent_at: new Date().toISOString(),
            })
            .eq('id', id);

          if (updateError) {
            console.error('Error updating note after send:', updateError);
            // Note was sent but DB update failed - log for manual resolution
            return apiSuccess(
              {
                warning: 'Note was sent but database update failed',
                order_id: result.order_id,
                tracking_number: result.tracking_number,
              },
              207 // Multi-Status
            );
          }

          // Log event
          await supabase.from('events').insert({
            account_id: context.accountId,
            user_id: context.userId,
            event_type: 'note.sent',
            resource_type: 'note',
            resource_id: note.id,
            payload: {
              order_id: result.order_id,
              status: result.status,
              tracking_number: result.tracking_number,
              via_api: true,
            },
          });

          return apiSuccess(
            {
              order_id: result.order_id,
              status: result.status,
              tracking_number: result.tracking_number,
              estimated_delivery: result.estimated_delivery,
              message: 'Note sent successfully. You will be billed $10.00 on your next monthly invoice.',
            },
            200
          );
        } catch (handwriteError: any) {
          console.error('Handwrite.io API error:', handwriteError);

          return apiError(
            `Failed to send note: ${handwriteError.message}`,
            500,
            handwriteError.cause?.message || handwriteError.toString()
          );
        }
      } catch (error) {
        console.error('Error in POST /api/v1/notes/:id/send:', error);
        return apiError('Internal server error', 500);
      }
    },
    {
      requiredScope: 'notes:send',
      params: { params },
    }
  );
}
