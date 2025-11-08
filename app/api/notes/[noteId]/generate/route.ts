import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { AssemblyAI } from 'assemblyai';
import Anthropic from '@anthropic-ai/sdk';

const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Scoring function for note quality
interface NoteScore {
  lengthScore: number; // 0-100 (binary: pass/fail)
  styleMatchScore: number; // 0-100 (semantic similarity)
  personalizationScore: number; // 0-10 (# of specific details)
  emotionalResonanceScore: number; // 0-10 (matches customer tone)
  naturalFlowScore: number; // 0-10 (readability)
  totalScore: number;
  note: string;
  variationName: string;
  charCount: number;
}

function scoreNote(
  note: string,
  analyzedData: any,
  learnedStyle: any,
  variationName: string
): NoteScore {
  const charCount = note.length;

  // 1. Length Compliance (binary pass/fail, weighted 100 points)
  const lengthScore = charCount >= 270 && charCount <= 320 ? 100 : 0;

  // 2. Style Match (simplified heuristic for now, 0-100)
  // Check for common phrases from learned style
  let styleMatchScore = 50; // Base score
  if (learnedStyle?.common_phrases) {
    const matchedPhrases = learnedStyle.common_phrases.filter((phrase: string) =>
      note.toLowerCase().includes(phrase.toLowerCase())
    );
    styleMatchScore = Math.min(100, 50 + matchedPhrases.length * 15);
  }

  // 3. Personalization Depth (0-10, count specific details)
  let personalizationScore = 0;
  if (analyzedData?.key_moments) {
    // Check if note references key moments
    analyzedData.key_moments.forEach((moment: any) => {
      const keywords = moment.content.toLowerCase().split(' ');
      const noteWords = note.toLowerCase();
      if (keywords.some((kw: string) => kw.length > 4 && noteWords.includes(kw))) {
        personalizationScore += 2;
      }
    });
  }
  personalizationScore = Math.min(10, personalizationScore);

  // 4. Emotional Resonance (0-10, matches customer emotion)
  let emotionalResonanceScore = 5; // Default neutral
  if (analyzedData?.customer_profile?.emotional_tone) {
    const customerTone = analyzedData.customer_profile.emotional_tone.toLowerCase();
    const noteTone = note.toLowerCase();

    if (customerTone.includes('excited') && (noteTone.includes('excited') || noteTone.includes('thrilled'))) {
      emotionalResonanceScore = 9;
    } else if (customerTone.includes('happy') && noteTone.includes('happy')) {
      emotionalResonanceScore = 8;
    } else if (customerTone.includes('concerned') && noteTone.includes('understand')) {
      emotionalResonanceScore = 7;
    }
  }

  // 5. Natural Flow (0-10, sentence structure)
  let naturalFlowScore = 7; // Base score
  const sentences = note.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length >= 3 && sentences.length <= 5) {
    naturalFlowScore = 9; // Good sentence count
  }
  // Check for run-on sentences
  const avgSentenceLength = note.length / sentences.length;
  if (avgSentenceLength > 100) {
    naturalFlowScore -= 2; // Penalty for run-ons
  }

  // Calculate total score
  // Weights: Length is critical (40%), Style (25%), Personalization (20%), Emotion (10%), Flow (5%)
  const totalScore =
    (lengthScore * 0.4) +
    (styleMatchScore * 0.25) +
    (personalizationScore * 2.5) + // Scale 0-10 to 0-25
    (emotionalResonanceScore * 1.0) + // Scale 0-10 to 0-10
    (naturalFlowScore * 0.5); // Scale 0-10 to 0-5

  return {
    lengthScore,
    styleMatchScore,
    personalizationScore,
    emotionalResonanceScore,
    naturalFlowScore,
    totalScore,
    note,
    variationName,
    charCount,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { noteId } = await params;

    // Get the note with its deal and call data
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select(`
        *,
        deals:deal_id (*),
        calls:call_id (*)
      `)
      .eq('id', noteId)
      .single();

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const call = note.calls;
    const deal = note.deals;

    // Check if user has completed learning (25+ notes)
    const { data: userData } = await supabase
      .from('users')
      .select('learning_complete, tone_preferences')
      .eq('id', note.user_id)
      .single();

    const hasLearnedStyle = userData?.learning_complete && userData?.tone_preferences;

    // Step 1: Transcribe audio if not already done
    let transcript = call.transcript;
    let keyMoments = call.key_moments;

    if (!transcript && (call.mp3_url || call.mp3_storage_path)) {
      console.log('Transcribing audio...');

      // Get signed URL if using storage
      let audioUrl = call.mp3_url;
      if (call.mp3_storage_path && !audioUrl) {
        const { data: urlData } = await supabase.storage
          .from('call-audio')
          .createSignedUrl(call.mp3_storage_path, 3600);
        audioUrl = urlData?.signedUrl;
      }

      if (!audioUrl) {
        throw new Error('No audio URL available');
      }

      // Transcribe with AssemblyAI
      const transcriptResponse = await assemblyai.transcripts.transcribe({
        audio: audioUrl,
        speaker_labels: true, // Who said what
      });

      if (transcriptResponse.status === 'error') {
        throw new Error(`Transcription failed: ${transcriptResponse.error}`);
      }

      transcript = transcriptResponse.text || '';

      // Extract key moments (simple approach - just take sentences with important keywords)
      const sentences = transcript.split(/[.!?]+/);
      const importantKeywords = [
        'thank',
        'appreciate',
        'excited',
        'looking forward',
        'perfect',
        'great',
        'love',
        'happy',
      ];

      const moments = sentences
        .filter((sentence: string) =>
          importantKeywords.some((keyword: string) =>
            sentence.toLowerCase().includes(keyword)
          )
        )
        .slice(0, 3)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      keyMoments = moments.join('. ');

      // Update call record with transcript
      await supabase
        .from('calls')
        .update({
          transcript,
          key_moments: keyMoments,
          transcript_status: 'complete',
          transcribed_at: new Date().toISOString(),
        })
        .eq('id', call.id);
    }

    // Step 1.5: Analyze the call if not already done
    if (call && transcript && !call.analyzed_data) {
      console.log('Call not yet analyzed - triggering intelligent analysis...');

      // Trigger analysis (don't wait for it - continue with generation)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calls/${call.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(err => console.error('Error triggering analysis:', err));
    }

    // Step 2: Generate thank you note with Claude (MULTI-SHOT APPROACH)
    console.log('Generating thank you note with multi-shot approach (3 variations)...');

    // Use analyzed data if available, otherwise fall back to full transcript
    const hasAnalyzedData = call?.analyzed_data && call.analysis_status === 'complete';
    const fullTranscript = transcript || '';

    console.log(`Using ${hasAnalyzedData ? 'ANALYZED DATA' : 'RAW TRANSCRIPT'} for generation`);

    // PHASE 2: Multi-Shot Generation with Scoring
    // Generate 3 variations with different approaches
    const variations: { note: string; approach: string }[] = [];

    // Define 3 different generation approaches
    const approaches = [
      {
        name: 'Variation A: Emotional Focus',
        instruction: hasAnalyzedData && call.analyzed_data?.key_moments?.[0]
          ? 'Focus primarily on the most emotional moment from the call: "' + call.analyzed_data.key_moments[0].content + '". Make this the centerpiece of your note.'
          : 'Focus on the most emotional and personal aspect of the conversation.',
      },
      {
        name: 'Variation B: Product Connection',
        instruction: hasAnalyzedData && call.analyzed_data?.product_connection
          ? 'Focus on why this product matters to them: "' + call.analyzed_data.product_connection + '". Connect the purchase to their life.'
          : 'Focus on how this purchase will benefit them and fit into their life.',
      },
      {
        name: 'Variation C: Balanced Blend',
        instruction: 'Blend multiple personal details (2-3 moments) with excitement about the product and a forward-looking statement.',
      },
    ];

    console.log('Generating 3 variations with different approaches...');

    // Generate all 3 variations in parallel
    for (const approach of approaches) {
      console.log(`Generating ${approach.name}...`);

      // Build system prompt based on whether user has learned style
      let systemPrompt = '';

      if (hasLearnedStyle && userData?.tone_preferences) {
        const style = userData.tone_preferences;
        const examples = style.best_examples?.slice(0, 2) || [];

        systemPrompt = `You are writing a thank-you note in this specific sales rep's established style.

CRITICAL CONSTRAINTS:
- MAXIMUM 320 characters total (HARD limit)
- TARGET LENGTH: ${style.avg_length ? `${style.avg_length - 20}-320` : '250-320'} characters
- Count every character including spaces and punctuation

LEARNED STYLE PROFILE:
Tone: ${style.tone_description || 'Warm and genuine'}
Structure: ${style.sentence_structure || '3-4 sentences'}
Formality: ${style.formality || 'Semi-formal'}
Enthusiasm: ${style.enthusiasm_level || 'Medium'}
Opening Style: ${style.opening_style || 'Friendly greeting with first name'}
Closing Style: ${style.closing_style || 'Warm sign-off with first name'}
Detail Level: ${style.detail_level || 'References 1-2 specific moments'}

COMMON PHRASES THIS REP USES:
${style.common_phrases?.slice(0, 5).map((p: string) => '- "' + p + '"').join('\n') || '(Using rep natural language - none learned yet)'}

EXAMPLES OF THIS REP'S APPROVED NOTES:
${examples.map((ex: string, i: number) => 'Example ' + (i + 1) + ':\n' + ex).join('\n\n') || ''}

KEY CHARACTERISTICS:
${style.key_characteristics?.map((c: string) => '- ' + c).join('\n') || ''}

SPECIFIC APPROACH FOR THIS VARIATION:
${approach.instruction}

YOUR TASK: Write a note that PERFECTLY matches this rep's style. Use their tone, their phrases, their structure. Make it indistinguishable from their own writing.`;
      } else {
        // Default prompt for first 25 notes
        systemPrompt = `You are a professional sales representative writing a handwritten thank-you note.

EXAMPLE OF PERFECT NOTE (275 characters - THIS IS YOUR TARGET):
"Hi Sarah! Thank you so much for trusting me with your new truck purchase. I loved hearing about your weekend camping trips - this F-150 is going to be perfect for those adventures. I'm here if you need anything at all. Looking forward to seeing you at pickup!
- Mike"

CRITICAL LENGTH REQUIREMENT:
- YOU MUST WRITE BETWEEN 270-320 CHARACTERS
- MINIMUM 270 characters (shorter notes will be REJECTED)
- MAXIMUM 320 characters (hard limit - handwriting service can't process longer)
- Count every character as you write including spaces and punctuation

CONTENT REQUIREMENTS:
- Use AT LEAST 2-3 specific details from the customer conversation
- Reference actual things they said or moments from the call
- Make it feel like you really listened and care
- Write 3-4 complete sentences (this naturally gets you to 270+ chars)

TONE & STYLE:
- Warm, genuine, and personal (like talking to a friend)
- No emojis or special formatting (this will be handwritten)
- Sign off with just your first name
- Natural and conversational, not corporate or robotic

STRUCTURE:
1. Greeting with customer's first name
2. Express gratitude with specific detail from call
3. Reference another personal detail or express excitement
4. Warm closing with your first name

SPECIFIC APPROACH FOR THIS VARIATION:
${approach.instruction}

IMPORTANT: Fill the space! Longer is better. Think 280-300 characters as your sweet spot.`;
      }

      // Build the user message based on what data we have
      let userMessage = `Write a thank-you note for this customer:

Customer Name: ${deal.customer_first_name} ${deal.customer_last_name}
Product/Service: ${deal.product_name || 'Not specified'}
Deal Value: ${deal.deal_value ? `$${deal.deal_value}` : 'Not specified'}
Personal Notes: ${deal.personal_detail || 'None provided'}

`;

      // Use analyzed data if available (WORLD-CLASS PATH)
      if (hasAnalyzedData && call.analyzed_data) {
        const analysis = call.analyzed_data;

        userMessage += `INTELLIGENT CALL ANALYSIS (use these insights!):\n\n`;

        if (analysis.key_moments && analysis.key_moments.length > 0) {
          userMessage += `KEY MOMENTS FROM CONVERSATION:\n`;
          analysis.key_moments.slice(0, 5).forEach((moment: any, i: number) => {
            userMessage += `${i + 1}. [${moment.timestamp}] ${moment.content} (${moment.emotion}, importance: ${moment.importance}/10)\n`;
          });
          userMessage += `\n`;
        }

        if (analysis.customer_profile) {
          const profile = analysis.customer_profile;
          userMessage += `CUSTOMER PROFILE:\n`;
          if (profile.emotional_tone) userMessage += `- Overall tone: ${profile.emotional_tone}\n`;
          if (profile.family?.length) userMessage += `- Family: ${profile.family.join(', ')}\n`;
          if (profile.interests?.length) userMessage += `- Interests: ${profile.interests.join(', ')}\n`;
          if (profile.life_events?.length) userMessage += `- Life events: ${profile.life_events.join(', ')}\n`;
          userMessage += `\n`;
        }

        if (analysis.product_connection) {
          userMessage += `WHY THIS PRODUCT MATTERS:\n${analysis.product_connection}\n\n`;
        }

        if (analysis.thank_you_angles && analysis.thank_you_angles.length > 0) {
          userMessage += `SUGGESTED ANGLES FOR NOTE:\n`;
          analysis.thank_you_angles.forEach((angle: string, i: number) => {
            userMessage += `${i + 1}. ${angle}\n`;
          });
          userMessage += `\n`;
        }

        if (analysis.commitments && analysis.commitments.length > 0) {
          userMessage += `COMMITMENTS TO REFERENCE:\n`;
          analysis.commitments.forEach((commitment: string) => {
            userMessage += `- ${commitment}\n`;
          });
          userMessage += `\n`;
        }

        userMessage += `YOUR TASK: Use the insights above to write a deeply personal thank-you note (270-320 characters). Reference at least 2-3 specific details from the key moments.`;

      } else {
        // Fallback to raw transcript (STANDARD PATH)
        userMessage += `${fullTranscript ? `FULL CALL TRANSCRIPT (use this for specific details!):\n${fullTranscript}\n` : ''}

${keyMoments ? `Key moments highlighted:\n${keyMoments}\n` : ''}

YOUR TASK: Write a thank-you note that is 270-320 characters. Pull specific details from the conversation above. Make it personal and genuine.`;
      }

      userMessage += `\n\nWrite the note now:`;

      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: hasLearnedStyle ? 0.6 : 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      const generatedNote = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

      // Store this variation
      variations.push({
        note: generatedNote,
        approach: approach.name,
      });

      console.log(`${approach.name}: ${generatedNote.length} characters`);
    }

    // PHASE 2: Score all variations and pick the best one
    console.log('\nScoring all variations...');

    const scores: NoteScore[] = variations.map((variation) =>
      scoreNote(
        variation.note,
        call?.analyzed_data,
        userData?.tone_preferences,
        variation.approach
      )
    );

    // Log all scores
    scores.forEach((score) => {
      console.log(`\n${score.variationName}:`);
      console.log(`  Length: ${score.lengthScore}/100 (${score.charCount} chars)`);
      console.log(`  Style Match: ${score.styleMatchScore}/100`);
      console.log(`  Personalization: ${score.personalizationScore}/10`);
      console.log(`  Emotional Resonance: ${score.emotionalResonanceScore}/10`);
      console.log(`  Natural Flow: ${score.naturalFlowScore}/10`);
      console.log(`  TOTAL SCORE: ${score.totalScore.toFixed(1)}/100`);
    });

    // Select the best variation
    // Must pass length check (lengthScore > 0), then pick highest total score
    const validScores = scores.filter((s) => s.lengthScore > 0);

    let bestScore: NoteScore;
    if (validScores.length > 0) {
      // Pick highest scoring valid note
      bestScore = validScores.reduce((best, current) =>
        current.totalScore > best.totalScore ? current : best
      );
      console.log(`\n✓ Selected: ${bestScore.variationName} (score: ${bestScore.totalScore.toFixed(1)})`);
    } else {
      // No valid notes - pick the one closest to 320 chars
      console.log('\n⚠️ No variations passed length check, selecting closest to 320 chars');
      bestScore = scores.reduce((best, current) => {
        const bestDiff = Math.abs(320 - best.charCount);
        const currentDiff = Math.abs(320 - current.charCount);
        return currentDiff < bestDiff ? current : best;
      });

      // Truncate if too long
      if (bestScore.charCount > 320) {
        const sentences = bestScore.note.split(/[.!?]+/);
        let truncated = '';
        for (const sentence of sentences) {
          const test = truncated + sentence + '.';
          if (test.length <= 320) {
            truncated = test;
          } else {
            break;
          }
        }
        bestScore.note = truncated.trim();
        bestScore.charCount = bestScore.note.length;
        console.log(`  Truncated to ${bestScore.charCount} chars`);
      }
    }

    const generatedNote = bestScore.note;

    // Step 3: Update note in database
    const finalCharCount = generatedNote.length;
    console.log(`Final note: ${finalCharCount} characters`);
    console.log(`Note preview: ${generatedNote.substring(0, 100)}...`);

    await supabase
      .from('notes')
      .update({
        draft_text: generatedNote,
        status: 'draft',
      })
      .eq('id', noteId);

    return NextResponse.json({
      success: true,
      note: generatedNote,
      character_count: finalCharCount,
      variations_generated: variations.length,
      selected_variation: bestScore.variationName,
      quality_score: bestScore.totalScore,
      score_breakdown: {
        length: bestScore.lengthScore,
        style_match: bestScore.styleMatchScore,
        personalization: bestScore.personalizationScore,
        emotional_resonance: bestScore.emotionalResonanceScore,
        natural_flow: bestScore.naturalFlowScore,
      },
      used_intelligent_analysis: hasAnalyzedData,
      analysis_quality_score: hasAnalyzedData ? call.analyzed_data?.analysis_quality_score : null,
      transcript_length: fullTranscript?.length || 0,
      keyMoments,
    });
  } catch (error: any) {
    console.error('Error generating note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate note' },
      { status: 500 }
    );
  }
}
