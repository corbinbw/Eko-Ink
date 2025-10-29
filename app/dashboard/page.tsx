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

  // Get user data with credits
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, credits')
    .eq('email', authUser.email)
    .single();

  if (!user) {
    redirect('/login');
  }

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
    .in('status', ['draft', 'approved']);

  const { count: delivered } = await supabaseAdmin
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'delivered');

  const credits = user.credits || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">EkoInk Dashboard</h1>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/settings"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Settings
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome, {authUser.email}!
          </h2>
          <p className="mt-2 text-gray-600">
            Your dashboard is ready. Start sending handwritten thank-you notes.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-600">Notes Sent</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{notesSent || 0}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-600">Pending Approval</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{pendingApproval || 0}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-600">Delivered</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{delivered || 0}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-600">Credits Remaining</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{credits}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/new-note" className="rounded-lg bg-blue-600 px-4 py-3 text-left text-white shadow hover:bg-blue-700 transition block">
              <h4 className="font-semibold">Send a Note</h4>
              <p className="mt-1 text-sm text-blue-100">Create a new thank-you note</p>
            </Link>

            <Link href="/dashboard/notes" className="rounded-lg bg-white px-4 py-3 text-left shadow hover:bg-gray-50 transition block">
              <h4 className="font-semibold text-gray-900">View Notes</h4>
              <p className="mt-1 text-sm text-gray-600">See all your notes</p>
            </Link>

            <Link href="/dashboard/credits" className="rounded-lg bg-white px-4 py-3 text-left shadow hover:bg-gray-50 transition block">
              <h4 className="font-semibold text-gray-900">Add Credits</h4>
              <p className="mt-1 text-sm text-gray-600">Purchase more credits</p>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        <div className="mt-8 rounded-lg bg-white p-12 text-center shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No notes yet</h3>
          <p className="mt-2 text-gray-600">
            Get started by sending your first handwritten thank-you note
          </p>
          <Link href="/dashboard/new-note" className="mt-6 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">
            Send First Note
          </Link>
        </div>
      </main>
    </div>
  );
}
