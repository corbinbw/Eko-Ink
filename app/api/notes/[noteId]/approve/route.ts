import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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
      .select('id, notes_sent_count, learning_complete')
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { final_text } = body;

    if (!final_text) {
      return NextResponse.json(
        { error: 'final_text is required' },
        { status: 400 }
      );
    }

    // Get the note to verify ownership
    const { data: existingNote } = await supabaseAdmin
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Update the note to approved status
    const { data: note, error: noteError } = await supabaseAdmin
      .from('notes')
      .update({
        final_text,
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (noteError) {
      console.error('Error approving note:', noteError);
      return NextResponse.json(
        { error: 'Failed to approve note' },
        { status: 500 }
      );
    }

    // Update user's notes_sent_count
    const newCount = (user.notes_sent_count || 0) + 1;
    const learningComplete = newCount >= 25;

    await supabaseAdmin
      .from('users')
      .update({
        notes_sent_count: newCount,
        learning_complete: learningComplete,
      })
      .eq('id', user.id);

    // Log event
    await supabaseAdmin.from('events').insert({
      user_id: user.id,
      event_type: 'note.approved',
      resource_type: 'note',
      resource_id: note.id,
      payload: {
        notes_sent_count: newCount,
        learning_complete: learningComplete,
      },
    });

    return NextResponse.json({
      success: true,
      note,
      notes_sent_count: newCount,
      learning_complete: learningComplete,
    });
  } catch (error) {
    console.error('Error in POST /api/notes/[noteId]/approve:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
