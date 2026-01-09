import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE(
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

    // Get the note to check if it's been sent
    const { data: note } = await supabaseAdmin
      .from('notes')
      .select('status, sent_at')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Prevent deletion if note has been sent
    if (note.status === 'sent' || note.sent_at) {
      return NextResponse.json(
        { error: 'Cannot delete a note that has already been sent' },
        { status: 403 }
      );
    }

    // Delete the note
    const { error: deleteError } = await supabaseAdmin
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting note:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/notes/[noteId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Get existing note to track changes
    const { data: existingNote } = await supabaseAdmin
      .from('notes')
      .select('draft_text, feedback_text')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    // Track that the user is making edits (for learning system)
    const editNote = existingNote?.draft_text !== draft_text
      ? `Edited at ${new Date().toISOString()}: Changed from ${existingNote?.draft_text?.length || 0} to ${draft_text.length} characters`
      : existingNote?.feedback_text || '';

    // Update the note
    const { data: note, error } = await supabaseAdmin
      .from('notes')
      .update({
        draft_text,
        feedback_text: editNote, // Track that edits were made
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
