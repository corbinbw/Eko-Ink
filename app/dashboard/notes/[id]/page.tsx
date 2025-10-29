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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Note not found</h2>
          <Link
            href="/dashboard/notes"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            ← Back to notes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Review Note</h1>
            <Link
              href="/dashboard/notes"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Notes
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Customer & Deal Info */}
          <div className="space-y-6">
            {/* Customer Info Card */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium text-gray-900">
                    {note.deals?.customer_first_name} {note.deals?.customer_last_name}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Deal Info Card */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Deal Details</h2>
              <dl className="space-y-3 text-sm">
                {note.deals?.product_name && (
                  <div>
                    <dt className="text-gray-500">Product</dt>
                    <dd className="font-medium text-gray-900">{note.deals.product_name}</dd>
                  </div>
                )}
                {note.deals?.deal_value && (
                  <div>
                    <dt className="text-gray-500">Deal Value</dt>
                    <dd className="font-medium text-gray-900">
                      ${parseFloat(note.deals.deal_value).toLocaleString()}
                    </dd>
                  </div>
                )}
                {note.deals?.personal_detail && (
                  <div>
                    <dt className="text-gray-500">Personal Notes</dt>
                    <dd className="text-gray-900">{note.deals.personal_detail}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Call Details Card */}
            {note.calls && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Call Recording</h2>
                {note.calls.mp3_url && (
                  <audio controls className="w-full">
                    <source src={note.calls.mp3_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                )}
                {note.calls.key_moments && (
                  <div className="mt-4">
                    <dt className="text-sm font-medium text-gray-500 mb-2">Key Moments</dt>
                    <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                      {note.calls.key_moments}
                    </dd>
                  </div>
                )}
              </div>
            )}

            {/* Note Status */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Current Status</span>
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
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
                {note.approved_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Approved</span>
                    <span className="text-gray-900">
                      {new Date(note.approved_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {note.sent_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Sent</span>
                    <span className="text-gray-900">
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
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Tracking</h2>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Order ID</dt>
                    <dd className="font-mono text-xs text-gray-900">
                      {note.handwriteio_order_id}
                    </dd>
                  </div>
                  {note.handwriteio_status && (
                    <div>
                      <dt className="text-gray-500">Order Status</dt>
                      <dd className="font-medium text-gray-900 capitalize">
                        {note.handwriteio_status}
                      </dd>
                    </div>
                  )}
                  {note.tracking_number && (
                    <div>
                      <dt className="text-gray-500">Tracking Number</dt>
                      <dd className="font-mono text-xs text-gray-900">
                        {note.tracking_number}
                      </dd>
                    </div>
                  )}
                  {note.estimated_delivery && (
                    <div>
                      <dt className="text-gray-500">Estimated Delivery</dt>
                      <dd className="text-gray-900">
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
