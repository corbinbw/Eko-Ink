'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SignatureManager from './SignatureManager';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  account_id: string;
  signature_image_url: string | null;
  accounts: {
    credits_remaining: number;
    company_name: string;
  } | null;
}

interface SettingsClientProps {
  user: User;
  notesSent: number;
}

export default function SettingsClient({ user: initialUser, notesSent }: SettingsClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);

  const credits = (user.accounts as any)?.credits_remaining || 0;
  const companyName = (user.accounts as any)?.company_name || 'N/A';

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
                  <p className="mt-1 text-sm text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Role</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{user.role}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Company</label>
                  <p className="mt-1 text-sm text-gray-900">{companyName}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Notes Sent</label>
                  <p className="mt-1 text-sm text-gray-900">{notesSent}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Credits Remaining</label>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{credits}</p>
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
