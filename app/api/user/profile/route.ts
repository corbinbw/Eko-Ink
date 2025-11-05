import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
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

    const { name, companyName } = await request.json();

    // Get user's current data
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, account_id')
      .eq('email', authUser.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user name
    if (name) {
      const { error: updateUserError } = await supabaseAdmin
        .from('users')
        .update({ name })
        .eq('id', currentUser.id);

      if (updateUserError) {
        throw new Error(`Failed to update user name: ${updateUserError.message}`);
      }
    }

    // Update company name
    if (companyName && currentUser.account_id) {
      const { error: updateAccountError } = await supabaseAdmin
        .from('accounts')
        .update({ company_name: companyName })
        .eq('id', currentUser.account_id);

      if (updateAccountError) {
        throw new Error(`Failed to update company name: ${updateAccountError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
