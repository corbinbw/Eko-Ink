import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const supabase = await createClient();
    const supabaseAdmin = createServiceClient();

    // Check authentication
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { customer_address } = body;

    if (!customer_address) {
      return NextResponse.json(
        { error: 'customer_address is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!customer_address.street1 || !customer_address.city || !customer_address.state || !customer_address.zip) {
      return NextResponse.json(
        { error: 'Street address, city, state, and ZIP are required' },
        { status: 400 }
      );
    }

    // Validate state format (2 letters)
    if (!/^[A-Z]{2}$/.test(customer_address.state)) {
      return NextResponse.json(
        { error: 'State must be 2 uppercase letters (e.g., CA, NY)' },
        { status: 400 }
      );
    }

    // Validate ZIP format (5 digits)
    if (!/^\d{5}$/.test(customer_address.zip)) {
      return NextResponse.json(
        { error: 'ZIP code must be 5 digits' },
        { status: 400 }
      );
    }

    // Update the deal
    const { data: deal, error } = await supabaseAdmin
      .from('deals')
      .update({
        customer_address,
      })
      .eq('id', dealId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating deal:', error);
      return NextResponse.json(
        { error: 'Failed to update address' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deal });
  } catch (error) {
    console.error('Error in PATCH /api/deals/[dealId]/address:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
