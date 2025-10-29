import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function PATCH(
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

    // Parse request body
    const body = await request.json();
    const { draft_text } = body;

    if (!draft_text) {
      return NextResponse.json(
        { error: 'draft_text is required' },
        { status: 400 }
      );
    }

    // Update the note
    const { data: note, error } = await supabaseAdmin
      .from('notes')
      .update({
        draft_text,
      })
      .eq('id', noteId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error('Error in PATCH /api/notes/[noteId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
