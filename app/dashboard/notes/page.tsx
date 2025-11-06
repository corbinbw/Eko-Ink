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
              <Link href="/dashboard/notes" className="text-sm font-medium text-royal-ink dark:text-antique-gold">
                Notes
              </Link>
              <Link href="/dashboard/credits" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors">
                Credits
              </Link>
              <Link href="/dashboard/settings" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors">
                Settings
              </Link>
              <Link href="/dashboard/new-note" className="btn-gold">
                New Note
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-serif font-bold text-royal-ink dark:text-gray-100 mb-8">All Notes</h2>
        {notes && notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note: any) => (
              <div key={note.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-royal-ink dark:text-gray-100">
                        {note.deals?.customer_first_name} {note.deals?.customer_last_name}
                      </h3>
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

                    {note.deals?.product_name && (
                      <p className="mt-1 text-sm text-royal-ink/60 dark:text-gray-400">
                        {note.deals.product_name}
                        {note.deals.deal_value && ` - $${parseFloat(note.deals.deal_value).toLocaleString()}`}
                      </p>
                    )}

                    <div className="mt-4 rounded-md bg-gray-50 dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700">
                      {(note.draft_text && note.draft_text !== '' && note.draft_text !== 'Generating note...') || note.final_text ? (
                        <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {note.draft_text || note.final_text}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Note content not yet generated.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Created {new Date(note.created_at).toLocaleDateString()}</span>
                      {note.sent_at && (
                        <span>Sent {new Date(note.sent_at).toLocaleDateString()}</span>
                      )}
                      {note.delivered_at && (
                        <span>Delivered {new Date(note.delivered_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    {(!note.draft_text || note.draft_text === '' || note.draft_text === 'Generating note...') && !note.final_text && (
                      <GenerateNoteButton noteId={note.id} />
                    )}
                    {note.status === 'draft' && note.draft_text && note.draft_text !== '' && note.draft_text !== 'Generating note...' && (
                      <Link href={`/dashboard/notes/${note.id}`} className="px-4 py-2 bg-royal-ink dark:bg-royal-ink/90 text-white text-sm font-medium rounded-md hover:bg-royal-ink-600 dark:hover:bg-royal-ink text-center whitespace-nowrap transition-colors">
                        Review
                      </Link>
                    )}
                    {(note.status === 'approved' || note.status === 'sent' || note.status === 'delivered') && (
                      <Link href={`/dashboard/notes/${note.id}`} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-center whitespace-nowrap transition-colors">
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-20 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-serif font-semibold text-gray-900 dark:text-gray-100 mb-2">No notes yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Get started by creating your first handwritten note.
            </p>
            <Link href="/dashboard/new-note" className="btn-gold">
              Create Note
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
