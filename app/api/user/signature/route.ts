import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { signatureData } = await request.json();

    if (!signatureData) {
      return NextResponse.json({ error: 'Signature data is required' }, { status: 400 });
    }

    // Update user signature in the users table
    const { error } = await supabase
      .from('users')
      .update({ signature_image_url: signatureData })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating signature:', error);
      return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in signature route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove user signature from the users table
    const { error } = await supabase
      .from('users')
      .update({ signature_image_url: null })
      .eq('id', user.id);

    if (error) {
      console.error('Error deleting signature:', error);
      return NextResponse.json({ error: 'Failed to delete signature' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in signature delete route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
