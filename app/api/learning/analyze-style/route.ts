import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
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
      .select('id, notes_sent_count, learning_complete, tone_preferences')
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has sent at least 25 notes
    if (user.notes_sent_count < 25) {
      return NextResponse.json(
        {
          error: `Need 25 notes for analysis. Current count: ${user.notes_sent_count}`,
        },
        { status: 400 }
      );
    }

    // Check if already analyzed
    if (user.learning_complete && user.tone_preferences) {
      return NextResponse.json({
        message: 'Style already analyzed',
        tone_preferences: user.tone_preferences,
      });
    }

    console.log(`Analyzing writing style for user ${user.id}...`);

    // Fetch all approved notes with their edits
    const { data: notes, error: notesError } = await supabaseAdmin
      .from('notes')
      .select('id, draft_text, final_text, feedback_changes, feedback_given')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('approved_at', { ascending: true })
      .limit(25);

    if (notesError || !notes || notes.length < 25) {
      return NextResponse.json(
        { error: 'Could not fetch enough notes for analysis' },
        { status: 500 }
      );
    }

    console.log(`Found ${notes.length} approved notes to analyze`);

    // Prepare examples for AI analysis
    const examples = notes
      .filter((note) => note.final_text) // Only notes with final versions
      .slice(0, 10) // Use first 10 notes for analysis
      .map((note, index) => {
        const wasEdited = note.feedback_given || note.draft_text !== note.final_text;
        return `
Note ${index + 1}:
${wasEdited ? `AI Generated: ${note.draft_text}\n` : ''}Final Version: ${note.final_text}
${wasEdited ? '(User edited this note)' : '(User approved without edits)'}
`;
      })
      .join('\n---\n');

    // Use Claude Sonnet to analyze the writing style
    const analysisMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Using Sonnet for better analysis
      max_tokens: 2000,
      temperature: 0.3,
      system: `You are an expert writing analyst. Analyze the provided thank-you notes to extract the writer's unique style, tone, and preferences.

Your goal is to create a detailed style profile that can be used to generate future notes in the exact same voice.

Focus on:
1. Tone (warm/professional/enthusiastic/casual/formal)
2. Sentence structure (short/long, simple/complex)
3. Common phrases and word choices
4. Level of personal detail included
5. How they open and close notes
6. Average length and density of content

Be specific and actionable. Extract actual phrases and patterns that can be replicated.`,
      messages: [
        {
          role: 'user',
          content: `Analyze these ${notes.length} thank-you notes from a sales rep and create a comprehensive style profile:

${examples}

Provide a detailed JSON response with the following structure:
{
  "tone_description": "detailed description of writing tone",
  "avg_length": average character count,
  "sentence_structure": "description of sentence patterns",
  "common_phrases": ["array", "of", "frequently used phrases"],
  "opening_style": "how they typically start notes",
  "closing_style": "how they typically end notes",
  "detail_level": "description of how much personal detail they include",
  "formality": "casual|semi-formal|formal",
  "enthusiasm_level": "low|medium|high",
  "best_examples": ["2-3 of their best approved notes to use as examples"],
  "key_characteristics": ["list of defining features of their style"]
}`,
        },
      ],
    });

    // Parse the AI response
    const analysisText =
      analysisMessage.content[0].type === 'text' ? analysisMessage.content[0].text : '';

    // Extract JSON from the response
    let styleProfile;
    try {
      // Try to find JSON in the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        styleProfile = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create a basic profile from the text
        styleProfile = {
          tone_description: analysisText.substring(0, 500),
          avg_length: Math.round(
            notes.reduce((sum, n) => sum + (n.final_text?.length || 0), 0) / notes.length
          ),
          sentence_structure: 'Standard',
          common_phrases: [],
          best_examples: notes.slice(0, 3).map((n) => n.final_text),
        };
      }
    } catch (e) {
      console.error('Error parsing style profile:', e);
      return NextResponse.json(
        { error: 'Failed to parse style analysis' },
        { status: 500 }
      );
    }

    // Add metadata
    styleProfile.analyzed_at = new Date().toISOString();
    styleProfile.notes_analyzed = notes.length;
    styleProfile.analysis_model = 'claude-3-5-sonnet-20241022';

    console.log('Style profile generated:', styleProfile);

    // Save the style profile to the user
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        tone_preferences: styleProfile,
        learning_complete: true,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error saving style profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to save style profile' },
        { status: 500 }
      );
    }

    // Log event
    await supabaseAdmin.from('events').insert({
      user_id: user.id,
      event_type: 'learning.completed',
      resource_type: 'user',
      resource_id: user.id,
      payload: {
        notes_analyzed: notes.length,
        profile_created: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Style profile created successfully',
      tone_preferences: styleProfile,
      notes_analyzed: notes.length,
    });
  } catch (error: any) {
    console.error('Error in POST /api/learning/analyze-style:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
