import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError, validateRequestBody } from '@/lib/api-middleware';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/notes/:id
 * Get details for a specific note
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
        // Fetch note with deal data
        const { data: note, error } = await supabase
          .from('notes')
          .select(
            `
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
            delivered_at,
            deals!inner (
              id,
              account_id,
              customer_first_name,
              customer_last_name
            )
          `
          )
          .eq('id', id)
          .single();

        if (error || !note) {
          return apiError('Note not found', 404);
        }

        // Check account access
        const deal = Array.isArray(note.deals) ? note.deals[0] : note.deals;
        if (!deal || deal.account_id !== context.accountId) {
          return apiError('Note not found', 404);
        }

        return apiSuccess({
          note: {
            id: note.id,
            draft_text: note.draft_text,
            final_text: note.final_text,
            status: note.status,
            requires_approval: note.requires_approval,
            handwriteio_order_id: note.handwriteio_order_id,
            tracking_number: note.tracking_number,
            estimated_delivery: note.estimated_delivery,
            created_at: note.created_at,
            approved_at: note.approved_at,
            sent_at: note.sent_at,
            delivered_at: note.delivered_at,
            customer: {
              first_name: deal.customer_first_name,
              last_name: deal.customer_last_name,
            },
          },
        });
      } catch (error) {
        console.error('Error in GET /api/v1/notes/:id:', error);
        return apiError('Internal server error', 500);
      }
    },
    {
      requiredScope: 'notes:read',
      params: { params },
    }
  );
}

/**
 * PATCH /api/v1/notes/:id
 * Update note text (before approval)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiAuth(
    request,
    async (req, context, routeParams) => {
      const { id } = await routeParams.params;

      // Validate request body
      const validation = await validateRequestBody(req, (data: any) => {
        if (!data.draft_text && !data.final_text) {
          return { success: false, error: 'Either draft_text or final_text is required' };
        }
        return { success: true, data };
      });

      if (!validation.valid) {
        return validation.response;
      }

      const body = validation.data;
      const supabase = createServiceClient();

      try {
        // Check note exists and belongs to account
        const { data: existingNote, error: fetchError } = await supabase
          .from('notes')
          .select('id, status, deals!inner (account_id)')
          .eq('id', id)
          .single();

        if (fetchError || !existingNote) {
          return apiError('Note not found', 404);
        }

        const deal2 = Array.isArray(existingNote.deals) ? existingNote.deals[0] : existingNote.deals;
        if (!deal2 || deal2.account_id !== context.accountId) {
          return apiError('Note not found', 404);
        }

        // Can't edit sent notes
        if (existingNote.status === 'sent' || existingNote.status === 'delivered') {
          return apiError('Cannot edit a note that has already been sent', 400);
        }

        // Update note
        const { data: updatedNote, error: updateError } = await supabase
          .from('notes')
          .update({
            draft_text: body.draft_text || undefined,
            final_text: body.final_text || undefined,
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating note:', updateError);
          return apiError('Failed to update note', 500);
        }

        return apiSuccess({
          note: updatedNote,
          message: 'Note updated successfully',
        });
      } catch (error) {
        console.error('Error in PATCH /api/v1/notes/:id:', error);
        return apiError('Internal server error', 500);
      }
    },
    {
      requiredScope: 'notes:write',
      params: { params },
    }
  );
}
