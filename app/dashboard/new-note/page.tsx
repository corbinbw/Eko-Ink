'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewNotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerFirstName: '',
    customerLastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    productName: '',
    dealValue: '',
    personalDetail: '',
  });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();

      // Add deal details
      formDataToSend.append('customerFirstName', formData.customerFirstName);
      formDataToSend.append('customerLastName', formData.customerLastName);
      formDataToSend.append('addressLine1', formData.addressLine1);
      formDataToSend.append('addressLine2', formData.addressLine2);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('state', formData.state);
      formDataToSend.append('postalCode', formData.postalCode);
      formDataToSend.append('country', formData.country);
      formDataToSend.append('productName', formData.productName);
      formDataToSend.append('dealValue', formData.dealValue);
      formDataToSend.append('personalDetail', formData.personalDetail);

      // Add audio file or URL
      if (audioFile) {
        formDataToSend.append('audioFile', audioFile);
      } else if (audioUrl) {
        formDataToSend.append('audioUrl', audioUrl);
      } else {
        throw new Error('Please provide either an audio file or URL');
      }

      const response = await fetch('/api/deals', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create deal');
      }

      const data = await response.json();

      // Redirect to dashboard or note detail page
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Create Thank You Note</h1>
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Information */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={formData.customerFirstName}
                  onChange={(e) => setFormData({ ...formData, customerFirstName: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={formData.customerLastName}
                  onChange={(e) => setFormData({ ...formData, customerLastName: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="address1" className="block text-sm font-medium text-gray-700">
                Address Line 1 *
              </label>
              <input
                id="address1"
                type="text"
                required
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="123 Main St"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="address2" className="block text-sm font-medium text-gray-700">
                Address Line 2
              </label>
              <input
                id="address2"
                type="text"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Apt 4B"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mt-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City *
                </label>
                <input
                  id="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State *
                </label>
                <input
                  id="state"
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="UT"
                />
              </div>

              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                  ZIP Code *
                </label>
                <input
                  id="postalCode"
                  type="text"
                  required
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="84604"
                />
              </div>
            </div>
          </div>

          {/* Deal Information */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Deal Information</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="product" className="block text-sm font-medium text-gray-700">
                  Product/Service
                </label>
                <input
                  id="product"
                  type="text"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="36-month lease"
                />
              </div>

              <div>
                <label htmlFor="dealValue" className="block text-sm font-medium text-gray-700">
                  Deal Value ($)
                </label>
                <input
                  id="dealValue"
                  type="number"
                  step="0.01"
                  value={formData.dealValue}
                  onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="21874.55"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="personalDetail" className="block text-sm font-medium text-gray-700">
                Personal Detail
              </label>
              <textarea
                id="personalDetail"
                rows={3}
                value={formData.personalDetail}
                onChange={(e) => setFormData({ ...formData, personalDetail: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="They mentioned moving to St. George next month..."
              />
              <p className="mt-1 text-sm text-gray-500">
                Any personal details from the call to include in the note
              </p>
            </div>
          </div>

          {/* Call Recording */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Call Recording</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Audio File *
                </label>
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav"
                  onChange={(e) => {
                    setAudioFile(e.target.files?.[0] || null);
                    setAudioUrl(''); // Clear URL if file is selected
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-sm text-gray-500">
                  MP3 or WAV file, max 50MB
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">OR</span>
                </div>
              </div>

              <div>
                <label htmlFor="audioUrl" className="block text-sm font-medium text-gray-700">
                  Audio File URL
                </label>
                <input
                  id="audioUrl"
                  type="url"
                  value={audioUrl}
                  onChange={(e) => {
                    setAudioUrl(e.target.value);
                    setAudioFile(null); // Clear file if URL is entered
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="https://example.com/call-recording.mp3"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link
              href="/dashboard"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Note'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
