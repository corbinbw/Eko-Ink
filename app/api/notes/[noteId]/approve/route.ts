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
    const { final_text, feedback_text } = body;

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
    const wasEdited = originalDraft !== userFinal;

    // Extract what changed for learning
    const originalWords = new Set(originalDraft.toLowerCase().split(/\s+/).filter(Boolean));
    const finalWords = new Set(userFinal.toLowerCase().split(/\s+/).filter(Boolean));

    const phrasesAdded: string[] = [];
    const phrasesRemoved: string[] = [];

    if (wasEdited) {
      // Find phrases user added (simple 2-3 word phrases)
      const finalSentences = userFinal.split(/[.!?]+/).filter(Boolean);
      const originalSentences = originalDraft.split(/[.!?]+/).filter(Boolean);

      finalSentences.forEach(sentence => {
        const words = sentence.trim().split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
          const phrase = words.slice(i, i + 2).join(' ');
          if (phrase.length > 5 && !originalDraft.toLowerCase().includes(phrase.toLowerCase())) {
            phrasesAdded.push(phrase);
          }
        }
      });

      // Find phrases user removed
      originalSentences.forEach(sentence => {
        const words = sentence.trim().split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
          const phrase = words.slice(i, i + 2).join(' ');
          if (phrase.length > 5 && !userFinal.toLowerCase().includes(phrase.toLowerCase())) {
            phrasesRemoved.push(phrase);
          }
        }
      });
    }

    // Analyze the changes
    const editDelta = {
      original_length: originalDraft.length,
      final_length: userFinal.length,
      length_delta: userFinal.length - originalDraft.length,
      was_edited: wasEdited,
      phrases_added: phrasesAdded.slice(0, 5), // Limit to top 5
      phrases_removed: phrasesRemoved.slice(0, 5),
      edit_timestamp: new Date().toISOString(),
    };

    // Legacy feedback_changes for compatibility
    const feedbackChanges = {
      original_text: originalDraft,
      final_text: userFinal,
      original_length: originalDraft.length,
      final_length: userFinal.length,
      length_delta: userFinal.length - originalDraft.length,
      was_edited: wasEdited,
      edit_timestamp: new Date().toISOString(),
      original_word_count: originalDraft.split(/\s+/).filter(Boolean).length,
      final_word_count: userFinal.split(/\s+/).filter(Boolean).length,
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
        feedback_given: wasEdited,
        feedback_text: feedback_text || null,
        feedback_changes: feedbackChanges,
        edit_delta: editDelta, // NEW: Track specific changes for learning
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // YOUR CORE IDEA: Update voice profile based on edits immediately
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Get current tone_preferences
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('tone_preferences')
      .eq('id', user.id)
      .single();

    let updatedTonePrefs = currentUser?.tone_preferences || {};

    if (wasEdited) {
      // Update common phrases (add what user added)
      const existingPhrases = new Set(updatedTonePrefs.common_phrases || []);
      phrasesAdded.forEach(phrase => {
        if (phrase.length > 5) {
          existingPhrases.add(phrase);
        }
      });

      // Update banned phrases (what user removed)
      const existingBanned = new Set(updatedTonePrefs.banned_phrases || []);
      phrasesRemoved.forEach(phrase => {
        if (phrase.length > 5) {
          existingBanned.add(phrase);
        }
      });

      // Update average length
      const avgLength = updatedTonePrefs.avg_length || 290;
      const newAvgLength = Math.round((avgLength * 0.8) + (userFinal.length * 0.2)); // Weighted average

      updatedTonePrefs = {
        ...updatedTonePrefs,
        common_phrases: Array.from(existingPhrases).slice(-20), // Keep last 20
        banned_phrases: Array.from(existingBanned).slice(-10), // Keep last 10
        avg_length: newAvgLength,
        best_examples: [
          ...(updatedTonePrefs.best_examples || []).slice(-2), // Keep last 2
          userFinal, // Add this new approved note
        ],
        last_updated: new Date().toISOString(),
        notes_analyzed: newCount,
      };

      console.log(`[Learning] Updated voice profile: +${phrasesAdded.length} phrases, -${phrasesRemoved.length} banned, avg_length: ${newAvgLength}`);
    } else {
      // Even if not edited, add to examples
      updatedTonePrefs = {
        ...updatedTonePrefs,
        best_examples: [
          ...(updatedTonePrefs.best_examples || []).slice(-2),
          userFinal,
        ],
        last_updated: new Date().toISOString(),
        notes_analyzed: newCount,
      };
    }

    // Update user with new count AND updated voice profile
    await supabaseAdmin
      .from('users')
      .update({
        notes_sent_count: newCount,
        tone_preferences: updatedTonePrefs, // Update voice with each approval
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

    // Trigger comprehensive style analysis at 25 notes
    let styleAnalysis = null;

    if (reachedLearningThreshold) {
      // Note #25: Full style analysis
      console.log(`User ${user.id} reached 25 notes - triggering FULL style analysis`);

      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/learning/analyze-style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: request.headers.get('cookie') || '',
        },
      }).catch(err => {
        console.error('Error triggering style analysis:', err);
      });

      styleAnalysis = {
        triggered: true,
        type: 'full',
        message: 'Comprehensive style analysis will be processed in the background',
      };
    } else {
      // Notes 1-24: Voice profile updates happen immediately above (edit delta tracking)
      styleAnalysis = {
        triggered: false,
        type: 'organic',
        message: `Voice profile updated organically (note ${newCount}/25)`,
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
