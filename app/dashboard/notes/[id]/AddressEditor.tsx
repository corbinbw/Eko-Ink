'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AddressEditorProps {
  dealId: string;
  currentAddress: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
    company?: string;
  } | null;
  customerName: {
    firstName: string;
    lastName: string;
  };
}

export default function AddressEditor({ dealId, currentAddress, customerName }: AddressEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState({
    street1: currentAddress?.street1 || '',
    street2: currentAddress?.street2 || '',
    city: currentAddress?.city || '',
    state: currentAddress?.state || '',
    zip: currentAddress?.zip || '',
    company: currentAddress?.company || '',
  });

  const isComplete = address.street1 && address.city && address.state && address.zip;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/deals/${dealId}/address`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer_address: address }),
      });

      if (!response.ok) {
        throw new Error('Failed to update address');
      }

      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update address');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setAddress({
      street1: currentAddress?.street1 || '',
      street2: currentAddress?.street2 || '',
      city: currentAddress?.city || '',
      state: currentAddress?.state || '',
      zip: currentAddress?.zip || '',
      company: currentAddress?.company || '',
    });
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Customer Address</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Edit
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {!isComplete && !isEditing && (
        <div className="mb-4 rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Address is incomplete. Please add missing information.
          </p>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Street Address *
            </label>
            <input
              type="text"
              value={address.street1}
              onChange={(e) => setAddress({ ...address, street1: e.target.value })}
              placeholder="123 Main St"
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Apartment, Suite, etc.
            </label>
            <input
              type="text"
              value={address.street2}
              onChange={(e) => setAddress({ ...address, street2: e.target.value })}
              placeholder="Apt 4B"
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                City *
              </label>
              <input
                type="text"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                placeholder="San Francisco"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                State * (2 letters)
              </label>
              <input
                type="text"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })}
                placeholder="CA"
                maxLength={2}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                ZIP Code * (5 digits)
              </label>
              <input
                type="text"
                value={address.zip}
                onChange={(e) => setAddress({ ...address, zip: e.target.value.replace(/\D/g, '') })}
                placeholder="94102"
                maxLength={5}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Company (optional)
              </label>
              <input
                type="text"
                value={address.company}
                onChange={(e) => setAddress({ ...address, company: e.target.value })}
                placeholder="Acme Corp"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !address.street1 || !address.city || !address.state || !address.zip}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </div>
      ) : (
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-medium text-gray-900 dark:text-gray-100">
              {customerName.firstName} {customerName.lastName}
            </dt>
          </div>
          {address.company && (
            <div>
              <dd className="text-gray-700 dark:text-gray-300">{address.company}</dd>
            </div>
          )}
          <div>
            <dd className="text-gray-700 dark:text-gray-300">{address.street1 || <em className="text-red-600 dark:text-red-400">Missing street address</em>}</dd>
          </div>
          {address.street2 && (
            <div>
              <dd className="text-gray-700 dark:text-gray-300">{address.street2}</dd>
            </div>
          )}
          <div>
            <dd className="text-gray-700 dark:text-gray-300">
              {address.city || <em className="text-red-600 dark:text-red-400">Missing city</em>},{' '}
              {address.state || <em className="text-red-600 dark:text-red-400">Missing state</em>}{' '}
              {address.zip || <em className="text-red-600 dark:text-red-400">Missing ZIP</em>}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
