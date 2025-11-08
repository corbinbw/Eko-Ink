import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const supabase = createServiceClient();
    const { callId } = await params;

    console.log(`Starting intelligent analysis for call ${callId}`);

    // Get the call with transcript
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*, deals:deal_id(customer_first_name, customer_last_name, product_name)')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    if (!call.transcript) {
      return NextResponse.json(
        { error: 'Call must be transcribed before analysis' },
        { status: 400 }
      );
    }

    // Update status to analyzing
    await supabase
      .from('calls')
      .update({ analysis_status: 'analyzing' })
      .eq('id', callId);

    const deal = call.deals as any;

    // Use Claude Sonnet for intelligent analysis
    const analysisMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Sonnet for better reasoning
      max_tokens: 2000,
      temperature: 0.3, // Low temp for consistent structure
      system: `You are an expert conversation analyst specializing in automotive sales calls.

Your task is to deeply analyze a sales call transcript and extract the most meaningful, personal moments that would make an excellent thank-you note.

Focus on:
1. **Emotional moments** - times when the customer expressed joy, excitement, concern, or relief
2. **Personal details** - family, hobbies, life events, future plans
3. **Specific product connections** - why THIS product matters to THEM
4. **Commitments made** - promises or follow-ups mentioned

Return your analysis as valid JSON with this exact structure:
{
  "key_moments": [
    {
      "timestamp": "approximate time (e.g., 'early in call', 'mid-conversation', 'near end')",
      "content": "brief description of what happened",
      "emotion": "customer's emotion (excited/happy/concerned/relieved/proud/etc)",
      "importance": 1-10 score,
      "context": "additional context if needed"
    }
  ],
  "customer_profile": {
    "emotional_tone": "overall emotional state",
    "family": ["array of family members mentioned"],
    "interests": ["hobbies, activities, passions"],
    "concerns_addressed": ["worries that were resolved"],
    "life_events": ["upcoming or recent significant events"]
  },
  "commitments": ["any promises or follow-ups mentioned"],
  "product_connection": "why this specific product matters to this customer (1-2 sentences)",
  "thank_you_angles": ["3-5 specific angles that would make great thank-you note content"],
  "analysis_quality_score": 0.0-1.0 (how rich/usable is this call data)
}

IMPORTANT: Only include information that is actually in the transcript. Don't invent details.`,
      messages: [
        {
          role: 'user',
          content: `Analyze this sales call transcript:

Customer: ${deal?.customer_first_name} ${deal?.customer_last_name}
Product: ${deal?.product_name || 'Not specified'}

FULL TRANSCRIPT:
${call.transcript}

Provide your analysis as JSON:`,
        },
      ],
    });

    // Extract JSON from response
    const analysisText =
      analysisMessage.content[0].type === 'text'
        ? analysisMessage.content[0].text
        : '';

    console.log('Raw analysis response:', analysisText.substring(0, 200));

    // Parse JSON from response
    let analyzedData;
    try {
      // Try to find JSON in the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analyzedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in analysis response');
      }
    } catch (parseError) {
      console.error('Failed to parse analysis JSON:', parseError);
      // Create a minimal fallback structure
      analyzedData = {
        key_moments: [],
        customer_profile: {
          emotional_tone: 'neutral',
          family: [],
          interests: [],
          concerns_addressed: [],
          life_events: [],
        },
        commitments: [],
        product_connection: 'Customer purchased the product',
        thank_you_angles: ['Express gratitude for their business'],
        analysis_quality_score: 0.3,
        error: 'Failed to parse AI response',
      };
    }

    console.log(
      `Analysis complete: ${analyzedData.key_moments?.length || 0} key moments found`
    );
    console.log(`Quality score: ${analyzedData.analysis_quality_score || 'N/A'}`);

    // Store the analyzed data
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        analyzed_data: analyzedData,
        analysis_status: 'complete',
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', callId);

    if (updateError) {
      console.error('Error storing analysis:', updateError);
      return NextResponse.json(
        { error: 'Failed to store analysis' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analyzed_data: analyzedData,
      key_moments_count: analyzedData.key_moments?.length || 0,
      quality_score: analyzedData.analysis_quality_score,
    });
  } catch (error: any) {
    console.error('Error in call analysis:', error);

    // Update status to failed
    const supabase = createServiceClient();
    const { callId } = await params;
    await supabase
      .from('calls')
      .update({
        analysis_status: 'failed',
        error_message: error.message,
      })
      .eq('id', callId);

    return NextResponse.json(
      { error: error.message || 'Failed to analyze call' },
      { status: 500 }
    );
  }
}
