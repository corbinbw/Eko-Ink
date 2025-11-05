'use client';

import { useState } from 'react';
import { createClientSupabase } from '@/lib/supabase/client-config';

export default function PasswordChange() {
  const [isChanging, setIsChanging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate passwords
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSaving(true);

    try {
      const supabase = await createClientSupabase();

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setIsChanging(false);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsChanging(false);
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="card-elegant">
      <h3 className="text-lg font-semibold text-royal-ink dark:text-gray-100 mb-4">Password</h3>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-800 dark:text-green-300">
          {success}
        </div>
      )}

      {!isChanging ? (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Update your password to keep your account secure.
          </p>
          <button
            onClick={() => setIsChanging(true)}
            className="rounded-md bg-royal-ink dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-royal-ink-600 dark:hover:bg-gray-600 transition-colors"
          >
            Change Password
          </button>
        </div>
      ) : (
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              placeholder="Enter new password"
              minLength={8}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Must be at least 8 characters long
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              placeholder="Confirm new password"
              minLength={8}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-md bg-royal-ink dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-royal-ink-600 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save New Password'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 rounded-md bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
