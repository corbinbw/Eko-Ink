import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-middleware';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/v1/notes/:id/approve
 * Approve a note
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
        // Check note exists and belongs to account
        const { data: existingNote, error: fetchError } = await supabase
          .from('notes')
          .select('id, status, deals!inner (account_id)')
          .eq('id', id)
          .single();

        if (fetchError || !existingNote) {
          return apiError('Note not found', 404);
        }

        const deal = Array.isArray(existingNote.deals) ? existingNote.deals[0] : existingNote.deals;
        if (!deal || deal.account_id !== context.accountId) {
          return apiError('Note not found', 404);
        }

        // Check if already approved
        if (existingNote.status === 'approved' || existingNote.status === 'sent' || existingNote.status === 'delivered') {
          return apiError('Note has already been approved or sent', 400);
        }

        // Update note status
        const { data: updatedNote, error: updateError } = await supabase
          .from('notes')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            requires_approval: false,
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          console.error('Error approving note:', updateError);
          return apiError('Failed to approve note', 500);
        }

        return apiSuccess({
          note: updatedNote,
          message: 'Note approved successfully. Use POST /api/v1/notes/:id/send to send it.',
        });
      } catch (error) {
        console.error('Error in POST /api/v1/notes/:id/approve:', error);
        return apiError('Internal server error', 500);
      }
    },
    {
      requiredScope: 'notes:write',
      params: { params },
    }
  );
}
