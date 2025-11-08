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

    // Calculate diff between AI draft and user's final version
    const originalDraft = existingNote.draft_text || '';
    const userFinal = final_text;

    // Analyze the changes
    const feedbackChanges = {
      original_text: originalDraft,
      final_text: userFinal,
      original_length: originalDraft.length,
      final_length: userFinal.length,
      length_delta: userFinal.length - originalDraft.length,
      was_edited: originalDraft !== userFinal,
      edit_timestamp: new Date().toISOString(),
      // Simple word-level analysis
      original_word_count: originalDraft.split(/\s+/).filter(Boolean).length,
      final_word_count: userFinal.split(/\s+/).filter(Boolean).length,
      // Sentence count
      original_sentences: originalDraft.split(/[.!?]+/).filter(Boolean).length,
      final_sentences: userFinal.split(/[.!?]+/).filter(Boolean).length,
    };

    // Update the note to approved status with feedback data
    const { data: note, error: noteError } = await supabaseAdmin
      .from('notes')
      .update({
        final_text,
        status: 'approved',
        approved_at: new Date().toISOString(),
        feedback_given: originalDraft !== userFinal, // True if user made changes
        feedback_changes: feedbackChanges,
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
    const reachedLearningThreshold = newCount === 25;

    await supabaseAdmin
      .from('users')
      .update({
        notes_sent_count: newCount,
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
        reached_learning_threshold: reachedLearningThreshold,
      },
    });

    // If this is the 25th note, trigger style analysis
    let styleAnalysis = null;
    if (reachedLearningThreshold) {
      console.log(`User ${user.id} reached 25 notes - triggering style analysis`);

      // Trigger style analysis (fire and forget - don't block the response)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/learning/analyze-style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward the auth cookie
          cookie: request.headers.get('cookie') || '',
        },
      }).catch(err => {
        console.error('Error triggering style analysis:', err);
      });

      styleAnalysis = {
        triggered: true,
        message: 'Style analysis will be processed in the background',
      };
    }

    // If learning is complete, auto-send the note
    let autoSendResult = null;
    if (user.learning_complete && newCount > 25) {
      console.log(`User ${user.id} has completed learning - auto-sending note ${noteId}`);

      // Trigger auto-send (fire and forget - don't block the response)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notes/${noteId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward the auth cookie
          cookie: request.headers.get('cookie') || '',
        },
      })
        .then(res => res.json())
        .then(data => {
          console.log('Auto-send result:', data);
        })
        .catch(err => {
          console.error('Error auto-sending note:', err);
        });

      autoSendResult = {
        triggered: true,
        message: 'Note will be sent automatically',
      };
    }

    return NextResponse.json({
      success: true,
      note,
      notes_sent_count: newCount,
      learning_complete: user.learning_complete || false,
      reached_learning_threshold: reachedLearningThreshold,
      style_analysis: styleAnalysis,
      auto_send: autoSendResult,
    });
  } catch (error) {
    console.error('Error in POST /api/notes/[noteId]/approve:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
