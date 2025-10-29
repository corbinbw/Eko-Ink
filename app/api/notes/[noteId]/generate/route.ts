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

    // Step 2: Generate thank you note with Claude
    console.log('Generating thank you note...');

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 250,
      temperature: 0.8,
      system: `You are a professional sales representative writing a handwritten thank-you note to a customer who just purchased from you.

CRITICAL CONSTRAINTS:
- MAXIMUM 280 characters total (this is a hard limit - the note will be rejected if longer)
- Aim for 40-55 words to stay under 280 characters
- Count every character including spaces and punctuation

STYLE GUIDELINES:
- Warm, genuine, and personal tone
- Reference one specific detail from the call or purchase
- No emojis (this will be handwritten)
- No special formatting (no bold, italics, etc)
- Sign off with just your first name
- Make it feel authentic and conversational, not robotic or overly formal

STRUCTURE:
1. Warm greeting with customer's first name
2. One sentence of gratitude with specific detail
3. One brief sentence about the product/service value
4. Simple closing and signature

Remember: Brevity is key. Every word counts toward the 280 character limit.`,
      messages: [
        {
          role: 'user',
          content: `Write a thank-you note for this customer:

Customer: ${deal.customer_first_name} ${deal.customer_last_name}
Product: ${deal.product_name || 'N/A'}
Deal Value: ${deal.deal_value ? `$${deal.deal_value}` : 'N/A'}
Personal Detail: ${deal.personal_detail || 'N/A'}

${keyMoments ? `Key moments from call:\n${keyMoments}` : ''}

${transcript ? `\nFull conversation:\n${transcript.substring(0, 1000)}...` : ''}

Write the note now:`,
        },
      ],
    });

    const generatedNote = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    // Step 3: Update note in database
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
      transcript: transcript?.substring(0, 500),
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
