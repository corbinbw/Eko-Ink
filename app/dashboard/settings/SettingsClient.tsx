'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SignatureManager from './SignatureManager';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  signature_image_url: string | null;
  notes_sent_count: number;
  learning_complete: boolean;
}

interface SettingsClientProps {
  user: User;
}

export default function SettingsClient({ user: initialUser }: SettingsClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);

  const handleSave = async (signatureData: string) => {
    const response = await fetch('/api/user/signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signatureData }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save signature');
    }

    const result = await response.json();

    // Update user state with new signature URL
    setUser({
      ...user,
      signature_image_url: result.signatureUrl,
    });

    // Refresh the page data
    router.refresh();
  };

  const handleDelete = async () => {
    const response = await fetch('/api/user/signature', {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete signature');
    }

    // Update user state to remove signature URL
    setUser({
      ...user,
      signature_image_url: null,
    });

    // Refresh the page data
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Information */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Name</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {user.first_name} {user.last_name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Notes Sent</label>
                  <p className="mt-1 text-sm text-gray-900">{user.notes_sent_count || 0} / 25</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Learning Status</label>
                  <p className="mt-1">
                    {user.learning_complete ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        In Progress
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Signature Management */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Your Signature</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Add your signature to personalize your handwritten notes
                </p>
              </div>
              <SignatureManager
                currentSignatureUrl={user.signature_image_url}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
