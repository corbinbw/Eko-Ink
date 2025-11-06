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

    // Only managers and executives can view team members
    if (user.role !== 'manager' && user.role !== 'executive') {
      return NextResponse.json(
        { error: 'Only managers and executives can view team members' },
        { status: 403 }
      );
    }

    // Get team members (users where manager_id = current user's id)
    const { data: teamMembers, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        notes_sent_count,
        created_at
      `)
      .eq('manager_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch team members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    // Get stats for each team member
    const membersWithStats = await Promise.all(
      (teamMembers || []).map(async (member) => {
        // Get note counts
        const { count: totalNotes } = await supabaseAdmin
          .from('notes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', member.id);

        const { count: sentNotes } = await supabaseAdmin
          .from('notes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', member.id)
          .in('status', ['sent', 'delivered']);

        const { count: pendingNotes } = await supabaseAdmin
          .from('notes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', member.id)
          .in('status', ['pending', 'draft', 'approved']);

        return {
          ...member,
          stats: {
            totalNotes: totalNotes || 0,
            sentNotes: sentNotes || 0,
            pendingNotes: pendingNotes || 0,
          },
        };
      })
    );

    return NextResponse.json({
      teamMembers: membersWithStats,
      totalMembers: membersWithStats.length,
    });
  } catch (error: any) {
    console.error('Get team members error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
