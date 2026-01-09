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

/**
 * POST /api/notes/[noteId]/generate
 *
 * Simplified single-shot note generation using per-rep voice profiles.
 * Flow: Transcribe → Extract Facts → Load Rep Voice → Generate Once → Validate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { noteId } = await params;

    console.log(`\n━━━ Starting note generation for ${noteId} ━━━`);

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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STAGE 1: TRANSCRIPTION (if needed, support multiple files)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    let transcript = call.transcript;

    if (!transcript) {
      // Check if we have multiple audio files in metadata
      const metadata = call.metadata as any;
      const hasMultipleFiles = metadata?.all_audio_urls?.length > 1 || metadata?.all_storage_paths?.length > 1;

      if (hasMultipleFiles) {
        console.log(`[Transcription] Starting for ${metadata.file_count} audio files...`);

        const audioUrls: string[] = [];

        // Get all audio URLs (from metadata)
        if (metadata.all_audio_urls?.length > 0) {
          audioUrls.push(...metadata.all_audio_urls);
        } else if (metadata.all_storage_paths?.length > 0) {
          // Generate signed URLs for all storage paths
          for (const path of metadata.all_storage_paths) {
            const { data: urlData } = await supabase.storage
              .from('call-audio')
              .createSignedUrl(path, 3600);
            if (urlData?.signedUrl) {
              audioUrls.push(urlData.signedUrl);
            }
          }
        }

        // Transcribe all files and combine
        const transcripts: string[] = [];
        for (let i = 0; i < audioUrls.length; i++) {
          const audioUrl = audioUrls[i];
          console.log(`[Transcription] Processing file ${i + 1}/${audioUrls.length}...`);

          const transcriptResponse = await assemblyai.transcripts.transcribe({
            audio: audioUrl,
            speaker_labels: true,
          });

          if (transcriptResponse.status === 'error') {
            console.error(`Transcription failed for file ${i + 1}: ${transcriptResponse.error}`);
            continue;
          }

          if (transcriptResponse.text) {
            transcripts.push(transcriptResponse.text);
          }
        }

        // Combine all transcripts
        transcript = transcripts.join('\n\n--- NEXT RECORDING ---\n\n');

        console.log(`[Transcription] ✓ Combined ${transcripts.length} transcripts (${transcript.length} chars total)`);

      } else if (call.mp3_url || call.mp3_storage_path) {
        // Single file transcription
        console.log('[Transcription] Starting...');

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
          speaker_labels: true,
        });

        if (transcriptResponse.status === 'error') {
          throw new Error(`Transcription failed: ${transcriptResponse.error}`);
        }

        transcript = transcriptResponse.text || '';

        console.log(`[Transcription] ✓ Complete (${transcript.length} chars)`);
      }

      // Update call record with combined transcript
      if (transcript) {
        await supabase
          .from('calls')
          .update({
            transcript,
            transcript_status: 'complete',
            transcribed_at: new Date().toISOString(),
          })
          .eq('id', call.id);
      }
    }

    if (!transcript) {
      throw new Error('No transcript available');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STAGE 2: FACT EXTRACTION (TEMPORARILY DISABLED - too slow for large transcripts)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // TODO: Optimize fact extraction for large transcripts or run async
    console.log('[Facts] Using basic facts from transcript (extraction disabled for speed)');
    const factsData = {
      customer_goal: deal.product_name ? `Purchase ${deal.product_name}` : 'Customer purchased product',
      product_purchased: deal.product_name || 'Product',
      key_moments: [],
      personal_details: [],
      next_steps: [],
      risk_flags: [],
      call_quality_score: 0.7,
    };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STAGE 3: LOAD REP VOICE PROFILE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const { data: userData } = await supabase
      .from('users')
      .select('notes_sent_count, learning_complete, tone_preferences, name')
      .eq('id', note.user_id)
      .single();

    const hasLearnedStyle = userData?.learning_complete && userData?.tone_preferences;
    const repName = userData?.name || 'Sales Rep';

    console.log(`[Voice] Rep: ${repName}, Notes sent: ${userData?.notes_sent_count || 0}, Learned: ${hasLearnedStyle ? 'Yes' : 'No'}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STAGE 4: BUILD PROMPT (3 parts: Rules + Facts + Voice)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // PART 1: System rules (same for everyone)
    let systemPrompt = `You are a precise note writer for handwritten thank-you cards.

CRITICAL LENGTH REQUIREMENT:
Your note MUST be between 270-320 characters. This is a HARD technical limit.
If your note exceeds 320 characters, it will be rejected by the handwriting service.

HARD CONSTRAINTS:
- MINIMUM 270 characters (too short = rejected)
- MAXIMUM 320 characters (too long = rejected by printer)
- Count EVERY character including spaces, punctuation, and line breaks
- Be concise - you have limited space
- 2-3 sentences maximum
- No emojis, special formatting, or metadata
- DO NOT include character counts, labels, or any meta-information in the note
- Output ONLY the handwritten note text itself

WRITING RULES:
- Use ONLY specific facts from the transcript
- NEVER invent or assume details
- Pick 1-2 most meaningful details (not everything)
- Keep sentences SHORT and direct

STRUCTURE:
1. Brief greeting with customer's first name
2. Thank them + reference ONE specific detail
3. Optional: ONE personal touch if space allows
4. Sign with sales rep's first name only

IMPORTANT: Aim for 290 characters. If you go over 310, you've failed.`;

    // PART 2: Add learned voice profile if available
    if (hasLearnedStyle && userData?.tone_preferences) {
      const style = userData.tone_preferences;

      systemPrompt += `\n\nREP'S LEARNED WRITING STYLE:
Tone: ${style.tone_description || 'Warm and genuine'}
Formality: ${style.formality || 'Semi-formal'}
Average length: ${style.avg_length || 290} characters
Opening style: ${style.opening_style || 'Friendly greeting with first name'}
Closing style: ${style.closing_style || 'Sign with first name only'}

COMMON PHRASES THIS REP USES:
${style.common_phrases?.slice(0, 5).map((p: string) => `- "${p}"`).join('\n') || '(No specific phrases learned yet)'}

PHRASES TO AVOID:
${style.banned_phrases?.map((p: string) => `- "${p}"`).join('\n') || '(None)'}

EXAMPLES OF THIS REP'S APPROVED NOTES:
${style.best_examples?.slice(0, 2).map((ex: string, i: number) => `Example ${i + 1}:\n${ex}`).join('\n\n') || '(No examples yet)'}

Match this rep's style exactly.`;
    }

    // PART 3: Build user message with transcript
    let userMessage = `Write a handwritten thank-you note for:\n\n`;

    userMessage += `CUSTOMER: ${deal.customer_first_name} ${deal.customer_last_name}\n`;
    userMessage += `PRODUCT: ${deal.product_name || 'Product/service'}\n\n`;

    // Use the raw transcript for context
    userMessage += `CALL TRANSCRIPT (extract key details from this):\n`;
    userMessage += `${transcript}\n\n`;

    userMessage += `INSTRUCTIONS:\n`;
    userMessage += `1. Skim the transcript for 1-2 meaningful personal details\n`;
    userMessage += `2. Write a SHORT thank-you note (TARGET: 290 characters)\n`;
    userMessage += `3. Include: Greeting + Thank you + ONE detail + Sign off\n`;
    userMessage += `4. Sign with just: ${repName.split(' ')[0]}\n`;
    userMessage += `5. Make it 270-320 characters total\n\n`;

    userMessage += `IMPORTANT: Output ONLY the note text. Do NOT include character counts, explanations, or any other text.\n\n`;

    userMessage += `Write the note now:`;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STAGE 5: GENERATE (single shot)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    console.log('[Generate] Calling Claude Haiku (single shot)...');

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

    let generatedNote = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    console.log(`[Generate] ✓ Generated ${generatedNote.length} chars`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STAGE 6: VALIDATION & RETRY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const charCount = generatedNote.length;

    if (charCount < 270 || charCount > 320) {
      console.log(`[Validate] ⚠ Length ${charCount} outside range, retrying...`);

      // Retry once with adjusted instruction
      const retryMessage = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0.5,
        system: systemPrompt + `\n\nIMPORTANT: Previous attempt was ${charCount} characters. ${charCount < 270 ? 'ADD MORE DETAIL - aim for 290 chars' : 'BE MORE CONCISE - aim for 300 chars'}.`,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      generatedNote = retryMessage.content[0].type === 'text' ? retryMessage.content[0].text.trim() : '';
      console.log(`[Validate] Retry result: ${generatedNote.length} chars`);
    }

    // If still too long after retry, truncate intelligently
    if (generatedNote.length > 320) {
      console.log(`[Validate] Still too long (${generatedNote.length}), truncating...`);
      const sentences = generatedNote.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      let truncated = '';
      for (const sentence of sentences) {
        const test = truncated + sentence.trim() + '.';
        if (test.length <= 320) {
          truncated = test.trim() + ' ';
        } else {
          break;
        }
      }
      generatedNote = truncated.trim();
      console.log(`[Validate] Truncated to ${generatedNote.length} chars`);
    }

    const finalCharCount = generatedNote.length;
    console.log(`[Validate] ✓ Final: ${finalCharCount} chars (${finalCharCount >= 270 && finalCharCount <= 320 ? 'PASS' : 'WARNING'})`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STAGE 7: SAVE & RETURN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    await supabase
      .from('notes')
      .update({
        draft_text: generatedNote,
        status: 'draft',
      })
      .eq('id', noteId);

    console.log(`━━━ Note generation complete for ${noteId} ━━━\n`);

    return NextResponse.json({
      success: true,
      note: generatedNote,
      character_count: finalCharCount,
      used_learned_style: hasLearnedStyle,
      facts_quality_score: factsData.call_quality_score,
      key_moments_used: factsData.key_moments?.length || 0,
      personal_details_used: factsData.personal_details?.filter((d: any) => d.risk_level !== 'high').length || 0,
    });
  } catch (error: any) {
    console.error('[Generate] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate note' },
      { status: 500 }
    );
  }
}
