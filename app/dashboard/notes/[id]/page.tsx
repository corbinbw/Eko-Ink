import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import NoteEditor from './NoteEditor';
import AddressEditor from './AddressEditor';

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  // Get the note with deal and call details
  const { data: note, error: noteError } = await supabaseAdmin
    .from('notes')
    .select(`
      *,
      deals:deal_id (
        id,
        customer_first_name,
        customer_last_name,
        customer_address,
        product_name,
        deal_value,
        personal_detail
      ),
      calls:call_id (
        transcript,
        key_moments,
        mp3_url
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!note) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif font-bold text-royal-ink dark:text-gray-100">Note not found</h2>
          <Link
            href="/dashboard/notes"
            className="mt-4 inline-block text-antique-gold hover:text-antique-gold-600 transition-colors"
          >
            ← Back to notes
          </Link>
        </div>
      </div>
    );
  }

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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-royal-ink dark:text-gray-100">Note Details</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Customer & Deal Info */}
          <div className="space-y-4">
            {/* Customer Info Card */}
            <div className="card-elegant">
              <h3 className="text-sm font-semibold text-royal-ink dark:text-gray-100 mb-3">Customer</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Name</dt>
                  <dd className="font-medium text-royal-ink dark:text-gray-100">
                    {note.deals?.customer_first_name} {note.deals?.customer_last_name}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Deal Info Card */}
            <div className="card-elegant">
              <h3 className="text-sm font-semibold text-royal-ink dark:text-gray-100 mb-3">Deal Details</h3>
              <dl className="space-y-3 text-sm">
                {note.deals?.product_name && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Product</dt>
                    <dd className="font-medium text-royal-ink dark:text-gray-100">{note.deals.product_name}</dd>
                  </div>
                )}
                {note.deals?.deal_value && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Deal Value</dt>
                    <dd className="font-medium text-royal-ink dark:text-gray-100">
                      ${parseFloat(note.deals.deal_value).toLocaleString()}
                    </dd>
                  </div>
                )}
                {note.deals?.personal_detail && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Personal Notes</dt>
                    <dd className="text-royal-ink dark:text-gray-300">{note.deals.personal_detail}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Call Details Card */}
            {note.calls && (
              <div className="card-elegant">
                <h3 className="text-sm font-semibold text-royal-ink dark:text-gray-100 mb-3">Call Recording</h3>
                {note.calls.mp3_url && (
                  <audio controls className="w-full">
                    <source src={note.calls.mp3_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                )}
                {note.calls.key_moments && (
                  <div className="mt-4">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Key Moments</dt>
                    <dd className="text-sm text-royal-ink dark:text-gray-300 whitespace-pre-wrap">
                      {note.calls.key_moments}
                    </dd>
                  </div>
                )}
              </div>
            )}

            {/* Note Status */}
            <div className="card-elegant">
              <h3 className="text-sm font-semibold text-royal-ink dark:text-gray-100 mb-3">Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
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
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Created</span>
                  <span className="text-royal-ink dark:text-gray-300">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
                {note.approved_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Approved</span>
                    <span className="text-royal-ink dark:text-gray-300">
                      {new Date(note.approved_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {note.sent_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Sent</span>
                    <span className="text-royal-ink dark:text-gray-300">
                      {new Date(note.sent_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Address Editor */}
            <AddressEditor
              dealId={note.deals?.id}
              currentAddress={note.deals?.customer_address}
              customerName={{
                firstName: note.deals?.customer_first_name || '',
                lastName: note.deals?.customer_last_name || '',
              }}
            />

            {/* Order Tracking Card */}
            {note.handwriteio_order_id && (
              <div className="card-elegant">
                <h3 className="text-sm font-semibold text-royal-ink dark:text-gray-100 mb-3">Order Tracking</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Order ID</dt>
                    <dd className="font-mono text-xs text-royal-ink dark:text-gray-300">
                      {note.handwriteio_order_id}
                    </dd>
                  </div>
                  {note.handwriteio_status && (
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Order Status</dt>
                      <dd className="font-medium text-royal-ink dark:text-gray-100 capitalize">
                        {note.handwriteio_status}
                      </dd>
                    </div>
                  )}
                  {note.tracking_number && (
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Tracking Number</dt>
                      <dd className="font-mono text-xs text-royal-ink dark:text-gray-300">
                        {note.tracking_number}
                      </dd>
                    </div>
                  )}
                  {note.estimated_delivery && (
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Estimated Delivery</dt>
                      <dd className="text-royal-ink dark:text-gray-300">
                        {new Date(note.estimated_delivery).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>

          {/* Right Column - Note Editor */}
          <div className="lg:col-span-2">
            <NoteEditor note={note} />
          </div>
        </div>
      </main>
    </div>
  );
}
