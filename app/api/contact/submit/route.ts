import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS policies and avoid infinite recursion
    const supabase = createServiceClient();

    // Get request metadata
    const referrer = request.headers.get('referer') || null;
    const userAgent = request.headers.get('user-agent') || null;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] :
                      request.headers.get('x-real-ip') || null;

    // Insert contact submission
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company?.trim() || null,
        message: message.trim(),
        referrer,
        user_agent: userAgent,
        ip_address: ipAddress,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving contact submission:', error);
      return NextResponse.json(
        { error: 'Failed to submit contact form' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
      id: data.id,
    });

  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
