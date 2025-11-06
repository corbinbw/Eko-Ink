import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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

    // Get user's profile and role
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role, account_id')
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and executives can view team stats
    if (user.role !== 'manager' && user.role !== 'executive') {
      return NextResponse.json(
        { error: 'Only managers and executives can view team stats' },
        { status: 403 }
      );
    }

    // Get team member IDs
    const { data: teamMembers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('manager_id', user.id);

    const teamMemberIds = teamMembers?.map((m) => m.id) || [];

    // If no team members, return zeros
    if (teamMemberIds.length === 0) {
      return NextResponse.json({
        totalMembers: 0,
        totalNotes: 0,
        notesSent: 0,
        notesDelivered: 0,
        pendingApproval: 0,
      });
    }

    // Get aggregate stats for all team members
    const { count: totalNotes } = await supabaseAdmin
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .in('user_id', teamMemberIds);

    const { count: notesSent } = await supabaseAdmin
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .in('user_id', teamMemberIds)
      .in('status', ['sent', 'delivered']);

    const { count: notesDelivered } = await supabaseAdmin
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .in('user_id', teamMemberIds)
      .eq('status', 'delivered');

    const { count: pendingApproval } = await supabaseAdmin
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .in('user_id', teamMemberIds)
      .in('status', ['draft', 'approved', 'pending']);

    return NextResponse.json({
      totalMembers: teamMemberIds.length,
      totalNotes: totalNotes || 0,
      notesSent: notesSent || 0,
      notesDelivered: notesDelivered || 0,
      pendingApproval: pendingApproval || 0,
    });
  } catch (error: any) {
    console.error('Get team stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team stats' },
      { status: 500 }
    );
  }
}
