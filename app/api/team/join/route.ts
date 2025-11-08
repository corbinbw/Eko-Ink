import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createServiceClient();

    // Get authenticated user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the invite code from request body
    const { inviteCode } = await request.json();

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // Get current user data
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, manager_id, account_id')
      .eq('email', authUser.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only solo reps can join a team
    if (currentUser.role !== 'rep' || currentUser.manager_id) {
      return NextResponse.json(
        { error: 'Only solo reps can join a team' },
        { status: 400 }
      );
    }

    // Find the manager with this invite code
    const { data: manager, error: managerError } = await supabaseAdmin
      .from('users')
      .select('id, role, account_id, invite_code')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (managerError || !manager) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      );
    }

    // Verify the inviter is a manager or executive
    if (manager.role !== 'manager' && manager.role !== 'executive') {
      return NextResponse.json(
        { error: 'Invalid invite code - not a team manager' },
        { status: 400 }
      );
    }

    // Update the user to join the team
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        manager_id: manager.id,
        account_id: manager.account_id,
      })
      .eq('id', currentUser.id);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to join team' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the team',
    });
  } catch (error) {
    console.error('Error in team join:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
