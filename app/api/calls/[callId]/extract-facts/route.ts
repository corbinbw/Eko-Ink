import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * POST /api/calls/[callId]/extract-facts
 *
 * Extracts structured facts from call transcript using Claude Sonnet.
 * This is the "ground truth" layer that prevents hallucinations.
 *
 * Facts extracted:
 * - customer_goal: Why they're buying
 * - product_purchased: Exact product name
 * - key_moments: Specific quotes/moments from the call
 * - personal_details: Family, hobbies, plans (with sensitivity flags)
 * - next_steps: Promised follow-ups
 * - risk_flags: Sensitive topics to avoid
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { callId } = await params;

    console.log(`[Extract Facts] Starting for call ${callId}`);

    // Get the call with transcript
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*, deals:deal_id(customer_first_name, customer_last_name, product_name, deal_value)')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    if (!call.transcript) {
      return NextResponse.json(
        { error: 'Call must be transcribed before fact extraction' },
        { status: 400 }
      );
    }

    // Check if facts already extracted
    if (call.extraction_status === 'complete' && call.facts_json) {
      console.log(`[Extract Facts] Already extracted, returning cached facts`);
      return NextResponse.json({
        success: true,
        cached: true,
        facts: call.facts_json,
      });
    }

    // Update status to processing
    await supabase
      .from('calls')
      .update({ extraction_status: 'processing' })
      .eq('id', callId);

    const deal = call.deals as any;

    console.log(`[Extract Facts] Using Claude Sonnet to extract structured facts...`);

    // Use Claude Sonnet with low temperature for consistent, factual extraction
    const extractionMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.2, // Low temp for factual consistency
      system: `You are a precise fact extraction system. Your ONLY job is to extract verifiable facts from sales call transcripts.

CRITICAL RULES:
1. ONLY include information explicitly stated in the transcript
2. NEVER infer, assume, or embellish
3. If something is ambiguous or unclear, omit it
4. Flag sensitive personal details with risk levels
5. Return ONLY valid JSON, no markdown formatting

Extract these facts:
- customer_goal: Why they're buying (1 sentence, their words)
- product_purchased: Exact product/service name mentioned
- key_moments: 3-5 specific quotes or moments (verbatim when possible)
- personal_details: Family, hobbies, plans (with "risk_level": "low|medium|high")
- next_steps: Promised follow-ups or commitments
- risk_flags: Sensitive topics mentioned (legal, health, religion, politics, financial hardship)`,
      messages: [
        {
          role: 'user',
          content: `Extract facts from this sales call:

Customer: ${deal?.customer_first_name} ${deal?.customer_last_name}
Product: ${deal?.product_name || 'Unknown'}
Deal Value: ${deal?.deal_value ? `$${deal.deal_value}` : 'Not specified'}

TRANSCRIPT:
${call.transcript}

Return JSON with this exact structure:
{
  "customer_goal": "one sentence why they're buying",
  "product_purchased": "exact product name",
  "key_moments": [
    {
      "quote": "verbatim quote if possible",
      "timestamp": "early|middle|late in call",
      "importance": 1-10
    }
  ],
  "personal_details": [
    {
      "detail": "specific detail mentioned",
      "category": "family|hobby|life_event|future_plan",
      "risk_level": "low|medium|high",
      "confidence": "high|medium|low"
    }
  ],
  "next_steps": ["array of commitments made"],
  "risk_flags": ["array of sensitive topics if any"],
  "call_quality_score": 0.0-1.0
}`,
        },
      ],
    });

    // Extract JSON from response
    const extractionText =
      extractionMessage.content[0].type === 'text'
        ? extractionMessage.content[0].text
        : '';

    console.log('[Extract Facts] Raw response length:', extractionText.length);

    // Parse JSON from response
    let factsData;
    try {
      // Try to find JSON in the response (remove markdown code blocks if present)
      const jsonMatch = extractionText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        factsData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in extraction response');
      }
    } catch (parseError) {
      console.error('[Extract Facts] Failed to parse JSON:', parseError);

      // Create minimal fallback structure
      factsData = {
        customer_goal: 'Customer purchased product',
        product_purchased: deal?.product_name || 'Unknown',
        key_moments: [],
        personal_details: [],
        next_steps: [],
        risk_flags: [],
        call_quality_score: 0.3,
        error: 'Failed to parse AI response',
      };

      // Still mark as complete but with low quality score
      await supabase
        .from('calls')
        .update({
          facts_json: factsData,
          extraction_status: 'failed',
          error_message: 'Failed to parse fact extraction JSON',
        })
        .eq('id', callId);

      return NextResponse.json(
        {
          error: 'Failed to parse facts',
          facts: factsData,
          partial: true
        },
        { status: 500 }
      );
    }

    console.log(`[Extract Facts] Extracted ${factsData.key_moments?.length || 0} key moments`);
    console.log(`[Extract Facts] Extracted ${factsData.personal_details?.length || 0} personal details`);
    console.log(`[Extract Facts] Call quality score: ${factsData.call_quality_score || 'N/A'}`);
    console.log(`[Extract Facts] Risk flags: ${factsData.risk_flags?.length || 0}`);

    // Store the extracted facts
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        facts_json: factsData,
        extraction_status: 'complete',
      })
      .eq('id', callId);

    if (updateError) {
      console.error('[Extract Facts] Error storing facts:', updateError);
      return NextResponse.json(
        { error: 'Failed to store extracted facts' },
        { status: 500 }
      );
    }

    console.log(`[Extract Facts] ✓ Complete for call ${callId}`);

    return NextResponse.json({
      success: true,
      facts: factsData,
      key_moments_count: factsData.key_moments?.length || 0,
      personal_details_count: factsData.personal_details?.length || 0,
      call_quality_score: factsData.call_quality_score,
      risk_flags_count: factsData.risk_flags?.length || 0,
    });
  } catch (error: any) {
    console.error('[Extract Facts] Error:', error);

    // Update status to failed
    const supabase = createServiceClient();
    const { callId } = await params;
    await supabase
      .from('calls')
      .update({
        extraction_status: 'failed',
        error_message: error.message,
      })
      .eq('id', callId);

    return NextResponse.json(
      { error: error.message || 'Failed to extract facts' },
      { status: 500 }
    );
  }
}
