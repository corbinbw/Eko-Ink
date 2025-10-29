import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import GenerateNoteButton from './GenerateNoteButton';

export default async function NotesPage() {
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Get user's account
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('account_id, id')
    .eq('email', authUser.email)
    .single();

  if (!user) {
    return <div>No user profile found</div>;
  }

  // Get all notes for this account
  const { data: notes } = await supabaseAdmin
    .from('notes')
    .select(`
      *,
      deals:deal_id (
        customer_first_name,
        customer_last_name,
        product_name,
        deal_value
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/settings"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Settings
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {notes && notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note: any) => (
              <div key={note.id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {note.deals?.customer_first_name} {note.deals?.customer_last_name}
                      </h3>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          note.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : note.status === 'approved'
                            ? 'bg-blue-100 text-blue-800'
                            : note.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : note.status === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {note.status}
                      </span>
                    </div>

                    {note.deals?.product_name && (
                      <p className="mt-1 text-sm text-gray-600">
                        {note.deals.product_name}
                        {note.deals.deal_value && ` - $${parseFloat(note.deals.deal_value).toLocaleString()}`}
                      </p>
                    )}

                    <div className="mt-4 rounded-md bg-gray-50 p-4">
                      {(note.draft_text && note.draft_text !== '' && note.draft_text !== 'Generating note...') || note.final_text ? (
                        <p className="whitespace-pre-wrap text-sm text-gray-700">
                          {note.draft_text || note.final_text}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          Note content not yet generated. Click "Generate Note" to create it.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                      <span>Created: {new Date(note.created_at).toLocaleDateString()}</span>
                      {note.sent_at && (
                        <span>Sent: {new Date(note.sent_at).toLocaleDateString()}</span>
                      )}
                      {note.delivered_at && (
                        <span>Delivered: {new Date(note.delivered_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    {(!note.draft_text || note.draft_text === '' || note.draft_text === 'Generating note...') && !note.final_text && (
                      <GenerateNoteButton noteId={note.id} />
                    )}
                    {note.status === 'draft' && note.draft_text && note.draft_text !== '' && note.draft_text !== 'Generating note...' && (
                      <Link href={`/dashboard/notes/${note.id}`}>
                        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                          Review & Approve
                        </button>
                      </Link>
                    )}
                    {(note.status === 'approved' || note.status === 'sent' || note.status === 'delivered') && (
                      <Link href={`/dashboard/notes/${note.id}`}>
                        <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                          View Details
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-12 text-center shadow">
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
              Create your first note to get started
            </p>
            <Link
              href="/dashboard/new-note"
              className="mt-6 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              Create Note
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
