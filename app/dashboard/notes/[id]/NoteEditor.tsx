'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface NoteEditorProps {
  note: any;
}

export default function NoteEditor({ note }: NoteEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState(note.draft_text || note.final_text || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draft_text: noteText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      setSuccess('Changes saved successfully');
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/notes/${note.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          final_text: noteText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve note');
      }

      setSuccess('Note approved successfully!');
      router.refresh();

      // Redirect to notes list after 1.5 seconds
      setTimeout(() => {
        router.push('/dashboard/notes');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve note');
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancel = () => {
    setNoteText(note.draft_text || note.final_text || '');
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleSend = async () => {
    if (!confirm('Are you sure you want to send this handwritten note? This action cannot be undone.')) {
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/notes/${note.id}/send`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send note');
      }

      setSuccess(`Note sent successfully! Order ID: ${data.order_id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send note');
    } finally {
      setIsSending(false);
    }
  };

  const wordCount = noteText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = noteText.length;
  const isWithinRange = wordCount >= 40 && wordCount <= 80;
  const isUnderCharLimit = charCount <= 320;

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Thank You Note</h2>
        <div className="flex items-center gap-4">
          <span
            className={`text-sm ${
              isUnderCharLimit ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {charCount}/320 characters
            {!isUnderCharLimit && (
              <span className="ml-1 font-semibold">
                (over limit!)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Note Text Area */}
      <div className="mb-6">
        {isEditing ? (
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-4 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            rows={12}
            placeholder="Edit your thank you note here..."
          />
        ) : (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-6">
            <p className="whitespace-pre-wrap text-gray-900 leading-relaxed">
              {noteText || 'No note content available'}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <div>
          {note.status === 'draft' && !isEditing && (
            <p className="text-sm text-gray-600">
              Review the note and make any edits before approving.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              {note.status === 'draft' && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Edit Note
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="rounded-md bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {isApproving ? 'Approving...' : 'Approve & Send'}
                  </button>
                </>
              )}
              {note.status === 'approved' && !note.handwriteio_order_id && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Edit Note
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isSending || !isUnderCharLimit}
                    className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSending ? 'Sending...' : 'Send Handwritten Note'}
                  </button>
                </>
              )}
              {note.status === 'sent' && (
                <div className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">
                  ✓ Note sent successfully
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Guidelines */}
      {isEditing && (
        <div className="mt-4 rounded-md bg-blue-50 p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Writing Guidelines</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>MUST be under 320 characters</strong> (handwriting service limit)</li>
            <li>Use a warm, genuine, and personal tone</li>
            <li>Reference one specific detail from the call or deal</li>
            <li>Avoid emojis or special characters (handwritten format)</li>
            <li>Sign with just your first name</li>
          </ul>
        </div>
      )}

      {/* Character limit warning */}
      {!isEditing && !isUnderCharLimit && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            <strong>Warning:</strong> This note is {charCount - 320} characters over the limit.
            It must be shortened before it can be sent to the handwriting service.
          </p>
        </div>
      )}
    </div>
  );
}
