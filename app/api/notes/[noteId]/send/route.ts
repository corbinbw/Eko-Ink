import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { handwriteIO } from '@/lib/handwriteio';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params;
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

    // Get the note with deal and customer information
    const { data: note, error: noteError } = await supabaseAdmin
      .from('notes')
      .select(`
        *,
        deals:deal_id (
          customer_first_name,
          customer_last_name,
          customer_address
        )
      `)
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      console.error('Error fetching note:', noteError);
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Verify note is approved
    if (note.status !== 'approved') {
      return NextResponse.json(
        { error: 'Note must be approved before sending' },
        { status: 400 }
      );
    }

    // Check if already sent
    if (note.handwriteio_order_id) {
      return NextResponse.json(
        { error: 'Note has already been sent' },
        { status: 400 }
      );
    }

    // Get final text (use draft_text if it exists, otherwise use final_text)
    // This allows sending edited notes after approval
    const message = note.draft_text || note.final_text;
    if (!message) {
      return NextResponse.json(
        { error: 'Note has no text to send' },
        { status: 400 }
      );
    }

    // Validate message length (320 character limit - Handwrite.io API limit)
    if (message.length > 320) {
      return NextResponse.json(
        { error: `Message is too long (${message.length} characters). Maximum is 320 characters. Please edit the note to make it shorter.` },
        { status: 400 }
      );
    }

    // Parse customer address
    const deal = note.deals as any;
    const customerAddress = deal.customer_address;

    if (!customerAddress || !customerAddress.street1 || !customerAddress.city || !customerAddress.state || !customerAddress.zip) {
      return NextResponse.json(
        { error: 'Customer address is incomplete' },
        { status: 400 }
      );
    }

    // TODO: Get these from user preferences or defaults
    const handwriting_id = process.env.HANDWRITEIO_DEFAULT_HANDWRITING_ID || 'default';
    const card_id = process.env.HANDWRITEIO_DEFAULT_CARD_ID || 'default';

    // Log what we're about to send for debugging
    console.log('Sending to Handwrite.io:', {
      message_length: message.length,
      handwriting_id,
      card_id,
      recipient: {
        firstName: deal.customer_first_name,
        lastName: deal.customer_last_name,
        city: customerAddress.city,
        state: customerAddress.state,
        zip: customerAddress.zip,
      },
    });

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
          street1: customerAddress.street1,
          street2: customerAddress.street2,
          city: customerAddress.city,
          state: customerAddress.state,
          zip: customerAddress.zip,
        },
      });

      // Update note with order information
      const { error: updateError } = await supabaseAdmin
        .from('notes')
        .update({
          status: 'sent',
          handwriteio_order_id: result.order_id,
          handwriteio_status: result.status,
          tracking_number: result.tracking_number,
          estimated_delivery: result.estimated_delivery,
          sent_at: new Date().toISOString(),
        })
        .eq('id', noteId);

      if (updateError) {
        console.error('Error updating note:', updateError);
        // Note was sent but DB update failed - log this for manual resolution
        return NextResponse.json(
          {
            warning: 'Note was sent but database update failed',
            order_id: result.order_id,
          },
          { status: 207 } // Multi-Status
        );
      }

      // Log event
      await supabaseAdmin.from('events').insert({
        user_id: user.id,
        event_type: 'note.sent',
        resource_type: 'note',
        resource_id: note.id,
        payload: {
          order_id: result.order_id,
          status: result.status,
          tracking_number: result.tracking_number,
        },
      });

      return NextResponse.json({
        success: true,
        order_id: result.order_id,
        status: result.status,
        tracking_number: result.tracking_number,
        estimated_delivery: result.estimated_delivery,
      });
    } catch (handwriteError: any) {
      console.error('Handwrite.io API error (full details):', {
        name: handwriteError.name,
        message: handwriteError.message,
        stack: handwriteError.stack,
        cause: handwriteError.cause,
        raw: handwriteError,
      });

      return NextResponse.json(
        {
          error: `Failed to send note: ${handwriteError.message}`,
          details: handwriteError.cause?.message || handwriteError.toString()
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/notes/[noteId]/send:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
