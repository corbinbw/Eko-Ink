import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Get user data with account credits
  let { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select(`
      id,
      email,
      name,
      role,
      account_id,
      accounts:account_id (
        credits_remaining
      )
    `)
    .eq('email', authUser.email)
    .single();

  // If user doesn't exist in users table, create them
  if (!user || userError) {
    console.log('User not found, creating new user...');

    // Get metadata from sign-up
    const role = (authUser.user_metadata?.role as string) || 'rep';
    const companyName = authUser.user_metadata?.company_name as string;
    const inviteCode = authUser.user_metadata?.invite_code as string;

    let accountId: string;
    let managerId: string | null = null;
    let teamId: string | null = null;

    if (inviteCode) {
      // User signed up with invite code - join existing account
      const { data: invitation } = await supabaseAdmin
        .from('invitations')
        .select('account_id, inviter_id, team_id')
        .eq('code', inviteCode)
        .eq('status', 'active')
        .single();

      if (!invitation) {
        console.error('Invalid or expired invite code:', inviteCode);
        redirect('/login');
      }

      accountId = invitation.account_id;
      managerId = invitation.inviter_id;
      teamId = invitation.team_id;

      // Mark invitation as used
      await supabaseAdmin
        .from('invitations')
        .update({
          status: 'used',
          used_by: authUser.id,
          used_at: new Date().toISOString(),
        })
        .eq('code', inviteCode);
    } else {
      // User is creating their own account (manager or executive)
      const { data: newAccount, error: accountError } = await supabaseAdmin
        .from('accounts')
        .insert({
          company_name: companyName || authUser.email?.split('@')[1] || 'Personal Account',
          credits_remaining: 0,
        })
        .select('id')
        .single();

      if (accountError || !newAccount) {
        console.error('Error creating account:', accountError);
        redirect('/login');
      }

      accountId = newAccount.id;

      // Generate invite code for managers and executives
      if (role === 'manager' || role === 'executive') {
        const inviteCodeGenerated = Array.from({ length: 8 }, () =>
          'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(Math.floor(Math.random() * 36))
        ).join('');

        await supabaseAdmin
          .from('users')
          .update({ invite_code: inviteCodeGenerated })
          .eq('id', authUser.id);
      }
    }

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.id,
        account_id: accountId,
        email: authUser.email!,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        role: role,
        manager_id: managerId,
        team_id: teamId,
      })
      .select(`
        id,
        email,
        name,
        role,
        account_id,
        accounts:account_id (
          credits_remaining
        )
      `)
      .single();

    if (createError || !newUser) {
      console.error('Error creating user:', createError);
      redirect('/login');
    }

    user = newUser;
  }

  const credits = (user.accounts as any)?.credits_remaining || 0;

  // Get note counts
  const { count: notesSent } = await supabaseAdmin
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['sent', 'delivered']);

  const { count: pendingApproval } = await supabaseAdmin
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['draft', 'approved', 'pending']);

  const { count: delivered } = await supabaseAdmin
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'delivered');

  // Get all notes count
  const { count: totalNotes } = await supabaseAdmin
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Get recent notes for display
  const { data: recentNotes } = await supabaseAdmin
    .from('notes')
    .select(`
      *,
      deals:deal_id (
        customer_first_name,
        customer_last_name
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-[#f8f7f2] dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/ekoink-logo.png" alt="EkoInk" className="h-12 w-auto" />
              <h1 className="text-3xl font-serif font-bold text-royal-ink dark:text-gray-100 italic">EkoInk</h1>
            </div>
            <div className="flex items-center gap-8">
              <Link
                href="/dashboard/notes"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors"
              >
                Notes
              </Link>
              {(user.role === 'manager' || user.role === 'executive') && (
                <Link
                  href="/dashboard/team"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors"
                >
                  Team
                </Link>
              )}
              <Link
                href="/dashboard/credits"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors"
              >
                Credits
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors"
              >
                Settings
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-16 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold text-royal-ink dark:text-gray-100">
              Welcome back, {user.name}
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Thoughtful notes, at scale
            </p>
          </div>
          <Link href="/dashboard/new-note" className="btn-gold">
            Create Note
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/notes" className="card-elegant cursor-pointer hover:scale-[1.02] transition-transform">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Notes Sent</p>
            <p className="text-4xl font-serif font-semibold text-royal-ink dark:text-gray-100">{notesSent || 0}</p>
          </Link>

          <Link href="/dashboard/notes" className="card-elegant cursor-pointer hover:scale-[1.02] transition-transform">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Pending</p>
            <p className="text-4xl font-serif font-semibold text-royal-ink dark:text-gray-100">{pendingApproval || 0}</p>
          </Link>

          <Link href="/dashboard/notes" className="card-elegant cursor-pointer hover:scale-[1.02] transition-transform">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Delivered</p>
            <p className="text-4xl font-serif font-semibold text-royal-ink dark:text-gray-100">{delivered || 0}</p>
          </Link>

          <Link href="/dashboard/credits" className="card-elegant cursor-pointer hover:scale-[1.02] transition-transform">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Credits</p>
            <p className="text-4xl font-serif font-semibold text-royal-ink dark:text-gray-100">{credits}</p>
          </Link>
        </div>

        {/* Recent Notes */}
        {recentNotes && recentNotes.length > 0 ? (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-serif font-bold text-royal-ink dark:text-gray-100">Recent Notes</h3>
              <Link href="/dashboard/notes" className="text-sm font-medium text-antique-gold hover:text-antique-gold-600 transition-colors flex items-center gap-1">
                View all
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-antique-gold/20 dark:border-antique-gold/30 divide-y divide-gray-100 dark:divide-gray-700 shadow-sm">
              {recentNotes.map((note: any) => (
                <Link
                  key={note.id}
                  href={`/dashboard/notes/${note.id}`}
                  className="block px-6 py-5 hover:bg-parchment/50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-royal-ink dark:text-gray-100 text-base">
                        {note.deals?.customer_first_name} {note.deals?.customer_last_name}
                      </p>
                      <p className="mt-1 text-sm text-royal-ink/60 dark:text-gray-400">
                        {new Date(note.created_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                      note.status === 'draft' ? 'bg-antique-gold/20 text-antique-gold-700 border border-antique-gold/30' :
                      note.status === 'approved' ? 'bg-royal-ink/10 text-royal-ink dark:bg-royal-ink/20 dark:text-gray-200 border border-royal-ink/20 dark:border-royal-ink/40' :
                      note.status === 'sent' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                      note.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                    }`}>
                      {note.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-20 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-serif font-semibold text-gray-900 dark:text-gray-100 mb-2">No notes yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Get started by creating your first handwritten note.
            </p>
            <Link href="/dashboard/new-note" className="btn-gold">
              Create Your First Note
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
