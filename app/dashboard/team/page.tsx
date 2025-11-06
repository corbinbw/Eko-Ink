import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export default async function TeamDashboardPage() {
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Get user data
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, account_id, invite_code')
    .eq('email', authUser.email)
    .single();

  if (!user) {
    return <div>No user profile found</div>;
  }

  // Only managers and executives can access this page
  if (user.role !== 'manager' && user.role !== 'executive') {
    redirect('/dashboard');
  }

  // Fetch team stats directly using supabaseAdmin
  const { data: teamMembers } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('manager_id', user.id);

  const teamMemberIds = teamMembers?.map((m) => m.id) || [];

  let statsData = {
    totalMembers: 0,
    totalNotes: 0,
    notesSent: 0,
    pendingApproval: 0,
  };

  if (teamMemberIds.length > 0) {
    const { count: totalNotes } = await supabaseAdmin
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .in('user_id', teamMemberIds);

    const { count: notesSent } = await supabaseAdmin
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .in('user_id', teamMemberIds)
      .in('status', ['sent', 'delivered']);

    const { count: pendingApproval } = await supabaseAdmin
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .in('user_id', teamMemberIds)
      .in('status', ['draft', 'approved', 'pending']);

    statsData = {
      totalMembers: teamMemberIds.length,
      totalNotes: totalNotes || 0,
      notesSent: notesSent || 0,
      pendingApproval: pendingApproval || 0,
    };
  }

  // Fetch team members with stats
  const { data: teamMembersData } = await supabaseAdmin
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

  const membersWithStats = await Promise.all(
    (teamMembersData || []).map(async (member) => {
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

  const membersData = {
    teamMembers: membersWithStats,
    totalMembers: membersWithStats.length,
  };

  const inviteUrl = user.invite_code
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup?code=${user.invite_code}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-[#f8f7f2] dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <img src="/ekoink-logo.png" alt="EkoInk" className="h-12 w-auto" />
              <h1 className="text-3xl font-serif font-bold text-royal-ink dark:text-gray-100 italic">EkoInk</h1>
            </Link>
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/notes" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors">
                Notes
              </Link>
              <Link href="/dashboard/team" className="text-sm font-medium text-royal-ink dark:text-antique-gold">
                Team
              </Link>
              <Link href="/dashboard/credits" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors">
                Credits
              </Link>
              <Link href="/dashboard/settings" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-royal-ink dark:text-gray-100">Team Management</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your sales team and track their performance
          </p>
        </div>

        {/* Team Stats */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          <div className="card-elegant">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Team Members</p>
            <p className="text-4xl font-serif font-semibold text-royal-ink dark:text-gray-100">
              {statsData.totalMembers || 0}
            </p>
          </div>

          <div className="card-elegant">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Notes</p>
            <p className="text-4xl font-serif font-semibold text-royal-ink dark:text-gray-100">
              {statsData.totalNotes || 0}
            </p>
          </div>

          <div className="card-elegant">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Notes Sent</p>
            <p className="text-4xl font-serif font-semibold text-royal-ink dark:text-gray-100">
              {statsData.notesSent || 0}
            </p>
          </div>

          <div className="card-elegant">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Pending</p>
            <p className="text-4xl font-serif font-semibold text-royal-ink dark:text-gray-100">
              {statsData.pendingApproval || 0}
            </p>
          </div>
        </div>

        {/* Invite Section */}
        {inviteUrl && (
          <div className="card-elegant mb-8">
            <h3 className="text-lg font-semibold text-royal-ink dark:text-gray-100 mb-4">Invite Team Members</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Share this link with your sales reps to invite them to join your team:
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 font-mono"
              />
              <button
                onClick={() => navigator.clipboard.writeText(inviteUrl)}
                className="px-4 py-2 bg-royal-ink dark:bg-antique-gold text-white dark:text-gray-900 text-sm font-semibold rounded-md hover:bg-royal-ink-600 dark:hover:bg-antique-gold-600 transition-colors"
              >
                Copy Link
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Your invite code: <span className="font-mono font-semibold">{user.invite_code}</span>
            </p>
          </div>
        )}

        {/* Team Members List */}
        <div className="card-elegant">
          <h3 className="text-lg font-semibold text-royal-ink dark:text-gray-100 mb-6">Team Members</h3>

          {membersData.teamMembers && membersData.teamMembers.length > 0 ? (
            <div className="space-y-4">
              {membersData.teamMembers.map((member: any) => (
                <div
                  key={member.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-antique-gold dark:hover:border-antique-gold/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-royal-ink dark:text-gray-100">{member.name}</h4>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                          {member.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{member.email}</p>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total Notes</p>
                          <p className="text-lg font-semibold text-royal-ink dark:text-gray-100">{member.stats.totalNotes}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Sent</p>
                          <p className="text-lg font-semibold text-royal-ink dark:text-gray-100">{member.stats.sentNotes}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                          <p className="text-lg font-semibold text-royal-ink dark:text-gray-100">{member.stats.pendingNotes}</p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No team members yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Share your invite link to add sales reps to your team
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
