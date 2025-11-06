'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SignatureManager from './SignatureManager';
import ThemeToggle from '@/components/ThemeToggle';
import PasswordChange from '@/components/PasswordChange';
import PaymentHistory from './PaymentHistory';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  account_id: string;
  signature_image_url?: string | null;
  accounts: {
    credits_remaining: number;
    company_name: string;
  }[] | {
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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: initialUser.name,
    companyName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle accounts being either an array or single object
  const accountData = Array.isArray(user.accounts) ? user.accounts[0] : user.accounts;
  const credits = accountData?.credits_remaining || 0;
  const companyName = accountData?.company_name || 'N/A';

  // Initialize edit form when user changes
  useState(() => {
    setEditForm({
      name: user.name,
      companyName: companyName !== 'N/A' ? companyName : '',
    });
  });

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      name: user.name,
      companyName: companyName !== 'N/A' ? companyName : '',
    });
    setError(null);
    setSuccess(null);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name,
          companyName: editForm.companyName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      setIsEditing(false);

      // Refresh the page to get updated data
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSignature = async (signatureData: string) => {
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

    router.refresh();
  };

  const handleDeleteSignature = async () => {
    const response = await fetch('/api/user/signature', {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete signature');
    }

    router.refresh();
  };

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
              <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-royal-ink dark:text-gray-300 dark:hover:text-antique-gold transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/notes" className="text-sm font-medium text-gray-700 hover:text-royal-ink dark:text-gray-300 dark:hover:text-antique-gold transition-colors">
                Notes
              </Link>
              <Link href="/dashboard/credits" className="text-sm font-medium text-gray-700 hover:text-royal-ink dark:text-gray-300 dark:hover:text-antique-gold transition-colors">
                Credits
              </Link>
              <Link href="/dashboard/settings" className="text-sm font-medium text-royal-ink dark:text-antique-gold">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-royal-ink dark:text-gray-100">Settings</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Information */}
          <div className="lg:col-span-1">
            <div className="card-elegant">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-royal-ink dark:text-gray-100">Profile</h3>
                {!isEditing && (
                  <button
                    onClick={handleEdit}
                    className="text-sm font-medium text-antique-gold hover:text-antique-gold-600 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
                  {success}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-ink focus:outline-none focus:ring-royal-ink dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:border-antique-gold dark:focus:ring-antique-gold"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-royal-ink dark:text-gray-100">{user.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</label>
                  <p className="mt-1 text-sm text-royal-ink dark:text-gray-100">{user.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</label>
                  <p className="mt-1 text-sm text-royal-ink dark:text-gray-100 capitalize">{user.role}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Company</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.companyName}
                      onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-ink focus:outline-none focus:ring-royal-ink dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:border-antique-gold dark:focus:ring-antique-gold"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-royal-ink dark:text-gray-100">{companyName}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Notes Sent</label>
                  <p className="mt-1 text-sm text-royal-ink dark:text-gray-100">{notesSent}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Credits Remaining</label>
                  <p className="mt-1 text-2xl font-semibold text-royal-ink dark:text-gray-100">{credits}</p>
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1 rounded-md bg-royal-ink px-4 py-2 text-sm font-semibold text-white shadow hover:bg-royal-ink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="lg:col-span-2 space-y-6">
            <ThemeToggle />

            <PasswordChange />

            <SignatureManager
              currentSignatureUrl={user.signature_image_url}
              onSave={handleSaveSignature}
              onDelete={handleDeleteSignature}
            />

            <PaymentHistory />
          </div>
        </div>
      </div>
    </div>
  );
}
