import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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

    // Get user's profile
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, account_id, role, team_id')
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and executives can generate invite codes
    if (user.role !== 'manager' && user.role !== 'executive') {
      return NextResponse.json(
        { error: 'Only managers and executives can generate invite codes' },
        { status: 403 }
      );
    }

    const { role: inviteeRole, expiresInDays } = await request.json();

    // Validate invitee role
    const validRoles = ['rep', 'manager'];
    if (!inviteeRole || !validRoles.includes(inviteeRole)) {
      return NextResponse.json({ error: 'Invalid role for invitee' }, { status: 400 });
    }

    // Managers can only invite reps
    if (user.role === 'manager' && inviteeRole !== 'rep') {
      return NextResponse.json(
        { error: 'Managers can only invite reps' },
        { status: 403 }
      );
    }

    // Generate unique code
    let code = generateRandomCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const { data: existing } = await supabaseAdmin
        .from('invitations')
        .select('id')
        .eq('code', code)
        .single();

      if (!existing) break;

      code = generateRandomCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique code' },
        { status: 500 }
      );
    }

    // Calculate expiration date
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create invitation
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from('invitations')
      .insert({
        code,
        inviter_id: user.id,
        account_id: user.account_id,
        role: inviteeRole,
        team_id: user.team_id,
        status: 'active',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create invitation:', insertError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Get account details for response
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('company_name')
      .eq('id', user.account_id)
      .single();

    return NextResponse.json({
      code: invitation.code,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup?code=${invitation.code}`,
      role: invitation.role,
      expiresAt: invitation.expires_at,
      companyName: account?.company_name,
    });
  } catch (error: any) {
    console.error('Generate invitation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invite code' },
      { status: 500 }
    );
  }
}

export async function GET() {
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

    // Get user's profile
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and executives can view invitations
    if (user.role !== 'manager' && user.role !== 'executive') {
      return NextResponse.json(
        { error: 'Only managers and executives can view invitations' },
        { status: 403 }
      );
    }

    // Get user's invitations
    const { data: invitations, error } = await supabaseAdmin
      .from('invitations')
      .select(`
        id,
        code,
        role,
        status,
        created_at,
        expires_at,
        used_at,
        used_by (
          name,
          email
        )
      `)
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch invitations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitations: invitations || [] });
  } catch (error: any) {
    console.error('Get invitations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}
