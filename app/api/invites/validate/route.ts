import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 });
    }

    const supabaseAdmin = createServiceClient();

    // Look up the invitation by code
    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .select(`
        id,
        code,
        inviter_id,
        account_id,
        role,
        team_id,
        status,
        expires_at
      `)
      .eq('code', code.toUpperCase())
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if invitation is active
    if (invitation.status !== 'active') {
      return NextResponse.json(
        { error: 'This invite code has already been used or is no longer valid' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return NextResponse.json({ error: 'This invite code has expired' }, { status: 400 });
    }

    // Get inviter details
    const { data: inviter } = await supabaseAdmin
      .from('users')
      .select('name, email, role')
      .eq('id', invitation.inviter_id)
      .single();

    // Get account details
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('company_name')
      .eq('id', invitation.account_id)
      .single();

    return NextResponse.json({
      valid: true,
      invitation: {
        code: invitation.code,
        role: invitation.role,
        inviterName: inviter?.name,
        companyName: account?.company_name,
      },
    });
  } catch (error: any) {
    console.error('Validate invitation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate invite code' },
      { status: 500 }
    );
  }
}
