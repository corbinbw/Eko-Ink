import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError, validateRequestBody } from '@/lib/api-middleware';
import { createServiceClient } from '@/lib/supabase/server';
import { trackApiUsage } from '@/lib/usage-tracker';

interface CreateDealRequest {
  rep_id?: string; // Optional: specific user ID
  customer: {
    first_name: string;
    last_name: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country?: string;
    };
  };
  deal?: {
    product_name?: string;
    deal_value?: number;
    closed_at?: string;
    personal_detail?: string;
  };
  call?: {
    mp3_url?: string;
    duration_seconds?: number;
  };
  transcript?: string;
  metadata?: Record<string, any>;
}

// Validation function
function validateCreateDeal(data: any): { success: boolean; data?: CreateDealRequest; error?: any } {
  // Required fields
  if (!data.customer) {
    return { success: false, error: 'customer is required' };
  }

  const { customer } = data;
  if (!customer.first_name || !customer.last_name) {
    return { success: false, error: 'customer.first_name and customer.last_name are required' };
  }

  if (!customer.address) {
    return { success: false, error: 'customer.address is required' };
  }

  const { address } = customer;
  if (!address.line1 || !address.city || !address.state || !address.postal_code) {
    return {
      success: false,
      error: 'customer.address must include line1, city, state, and postal_code',
    };
  }

  // At least one of mp3_url or transcript required
  if (!data.call?.mp3_url && !data.transcript) {
    return {
      success: false,
      error: 'Either call.mp3_url or transcript is required',
    };
  }

  return { success: true, data };
}

/**
 * POST /api/v1/deals
 * Create a new deal and generate thank you note
 */
export async function POST(request: NextRequest) {
  return withApiAuth(
    request,
    async (req, context) => {
      // Track API call
      await trackApiUsage({
        accountId: context.accountId,
        apiCalls: 1,
      });

      // Validate request body
      const validation = await validateRequestBody(req, validateCreateDeal);
      if (!validation.valid) {
        return validation.response;
      }

      const body = validation.data;
      const supabase = createServiceClient();

      try {
        // Determine which user to associate with
        let userId = body.rep_id || context.userId;

        // If rep_id provided, verify it belongs to this account
        if (body.rep_id) {
          const { data: user } = await supabase
            .from('users')
            .select('id, account_id')
            .eq('id', body.rep_id)
            .single();

          if (!user || user.account_id !== context.accountId) {
            return apiError('Invalid rep_id: user not found or does not belong to your account', 400);
          }

          userId = user.id;
        }

        // If no userId, use first user from account (for company-wide keys)
        if (!userId) {
          const { data: firstUser } = await supabase
            .from('users')
            .select('id')
            .eq('account_id', context.accountId)
            .limit(1)
            .single();

          if (!firstUser) {
            return apiError('No users found in account', 400);
          }

          userId = firstUser.id;
        }

        // Create deal
        const { data: deal, error: dealError } = await supabase
          .from('deals')
          .insert({
            account_id: context.accountId,
            user_id: userId,
            customer_first_name: body.customer.first_name,
            customer_last_name: body.customer.last_name,
            customer_address: {
              line1: body.customer.address.line1,
              line2: body.customer.address.line2 || '',
              city: body.customer.address.city,
              state: body.customer.address.state,
              postal_code: body.customer.address.postal_code,
              country: body.customer.address.country || 'US',
            },
            product_name: body.deal?.product_name || null,
            deal_value: body.deal?.deal_value || null,
            closed_at: body.deal?.closed_at || new Date().toISOString(),
            personal_detail: body.deal?.personal_detail || null,
          })
          .select()
          .single();

        if (dealError) {
          console.error('Error creating deal:', dealError);
          return apiError('Failed to create deal', 500);
        }

        // Create call record
        const { data: call, error: callError } = await supabase
          .from('calls')
          .insert({
            deal_id: deal.id,
            mp3_url: body.call?.mp3_url || null,
            duration_seconds: body.call?.duration_seconds || null,
            transcript: body.transcript || null,
            transcript_status: body.transcript ? 'complete' : body.call?.mp3_url ? 'pending' : 'pending',
            transcribed_at: body.transcript ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (callError) {
          console.error('Error creating call:', callError);
          return apiError('Failed to create call record', 500);
        }

        // Create note (will be generated in background)
        const { data: note, error: noteError } = await supabase
          .from('notes')
          .insert({
            deal_id: deal.id,
            user_id: userId,
            call_id: call.id,
            draft_text: '',
            status: 'pending',
            requires_approval: true,
          })
          .select()
          .single();

        if (noteError) {
          console.error('Error creating note:', noteError);
          return apiError('Failed to create note', 500);
        }

        // Trigger note generation in background (fire and forget)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/notes/${note.id}/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: req.headers.get('cookie') || '',
          },
        })
          .then((res) => res.json())
          .then((data) => {
            console.log('Note generation triggered:', data);
          })
          .catch((err) => {
            console.error('Error triggering note generation:', err);
          });

        // Return success
        return apiSuccess(
          {
            deal_id: deal.id,
            note_id: note.id,
            call_id: call.id,
            status: 'processing',
            message: 'Deal created successfully. Note is being generated.',
          },
          201
        );
      } catch (error) {
        console.error('Error in POST /api/v1/deals:', error);
        return apiError('Internal server error', 500);
      }
    },
    {
      requiredScope: 'deals:create',
    }
  );
}

/**
 * GET /api/v1/deals
 * List all deals for the account
 */
export async function GET(request: NextRequest) {
  return withApiAuth(
    request,
    async (req, context) => {
      const supabase = createServiceClient();
      const url = new URL(req.url);

      // Parse query params
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const status = url.searchParams.get('status'); // Filter by note status

      try {
        let query = supabase
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
            created_at,
            notes!inner (
              id,
              status,
              draft_text,
              created_at,
              sent_at
            )
          `
          )
          .eq('account_id', context.accountId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        // Filter by status if provided
        if (status) {
          query = query.eq('notes.status', status);
        }

        const { data: deals, error } = await query;

        if (error) {
          console.error('Error fetching deals:', error);
          return apiError('Failed to fetch deals', 500);
        }

        return apiSuccess({
          deals: deals || [],
          limit,
          offset,
          count: deals?.length || 0,
        });
      } catch (error) {
        console.error('Error in GET /api/v1/deals:', error);
        return apiError('Internal server error', 500);
      }
    },
    {
      requiredScope: 'deals:read',
    }
  );
}
