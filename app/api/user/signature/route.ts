import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// POST - Upload signature
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
      .select('id')
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { signatureData } = body;

    if (!signatureData) {
      return NextResponse.json(
        { error: 'signatureData is required' },
        { status: 400 }
      );
    }

    // Convert base64 data URL to blob
    const base64Data = signatureData.split(',')[1];
    const mimeType = signatureData.match(/data:([^;]+);/)?.[1] || 'image/png';
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Supabase Storage
    const fileName = `${authUser.id}/signature.png`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('signatures')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true, // Replace existing signature
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload signature' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('signatures')
      .getPublicUrl(fileName);

    // Update user record
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        signature_image_url: publicUrl,
        signature_storage_path: fileName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signatureUrl: publicUrl,
    });
  } catch (error) {
    console.error('Error in POST /api/user/signature:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove signature
export async function DELETE(request: NextRequest) {
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
      .select('id, signature_storage_path')
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete from storage if exists
    if (user.signature_storage_path) {
      const { error: deleteError } = await supabaseAdmin.storage
        .from('signatures')
        .remove([user.signature_storage_path]);

      if (deleteError) {
        console.error('Delete from storage error:', deleteError);
        // Continue anyway to clean up database
      }
    }

    // Update user record
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        signature_image_url: null,
        signature_storage_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/user/signature:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
