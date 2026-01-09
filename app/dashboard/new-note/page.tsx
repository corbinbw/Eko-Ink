'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewNotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

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

  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [audioUrl, setAudioUrl] = useState('');
  const [transcript, setTranscript] = useState('');

  // Fetch user role for navigation
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user.role);
        }
      } catch (err) {
        console.error('Failed to fetch user role:', err);
      }
    }
    fetchUserRole();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check file sizes before uploading
      if (audioFiles.length > 0) {
        for (const file of audioFiles) {
          const fileSizeMB = file.size / (1024 * 1024);
          if (fileSizeMB > 50) {
            throw new Error(
              `File "${file.name}" is ${fileSizeMB.toFixed(1)}MB, which exceeds the 50MB limit. Please use MP3 files or compress your audio.`
            );
          }
        }
      }

      // Process multiple files if provided (combine into one note)
      if (audioFiles.length > 0) {
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

        // Add all audio files (backend will combine them)
        audioFiles.forEach((file) => {
          formDataToSend.append('audioFiles', file);
        });

        const response = await fetch('/api/deals', {
          method: 'POST',
          body: formDataToSend,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create deal');
        }

        const data = await response.json();
        alert(data.message || `Deal created with ${audioFiles.length} audio files! Your note is being generated now.`);
        router.push('/dashboard/notes');
      } else {
        // Single note creation (URL or transcript)
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

        if (audioUrl) {
          formDataToSend.append('audioUrl', audioUrl);
        } else if (transcript) {
          formDataToSend.append('transcript', transcript);
        } else {
          throw new Error('Please provide either audio file(s), URL, or transcript');
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
        alert(data.message || 'Deal created! Your note is being generated and will be ready for review shortly.');
        router.push('/dashboard/notes');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
              <Link href="/dashboard" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/notes" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors">
                Notes
              </Link>
              {(userRole === 'manager' || userRole === 'executive') && (
                <Link href="/dashboard/team" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-royal-ink dark:hover:text-antique-gold transition-colors">
                  Team
                </Link>
              )}
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

      {/* Form */}
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-royal-ink dark:text-gray-100">Create Thank You Note</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Fill in the details below to create a personalized handwritten note
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div className="card-elegant">
            <h3 className="text-lg font-semibold text-royal-ink dark:text-gray-100 mb-4">Customer Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  First Name *
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={formData.customerFirstName}
                  onChange={(e) => setFormData({ ...formData, customerFirstName: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-royal-ink dark:focus:ring-antique-gold"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={formData.customerLastName}
                  onChange={(e) => setFormData({ ...formData, customerLastName: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-royal-ink dark:focus:ring-antique-gold"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="address1" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Address Line 1 *
              </label>
              <input
                id="address1"
                type="text"
                required
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-royal-ink dark:focus:ring-antique-gold"
                placeholder="123 Main St"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="address2" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Address Line 2
              </label>
              <input
                id="address2"
                type="text"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-royal-ink dark:focus:ring-antique-gold"
                placeholder="Apt 4B"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mt-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  City *
                </label>
                <input
                  id="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-royal-ink dark:focus:ring-antique-gold"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  State *
                </label>
                <input
                  id="state"
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-royal-ink dark:focus:ring-antique-gold"
                  placeholder="UT"
                />
              </div>

              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ZIP Code *
                </label>
                <input
                  id="postalCode"
                  type="text"
                  required
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-royal-ink dark:focus:ring-antique-gold"
                  placeholder="84604"
                />
              </div>
            </div>
          </div>

          {/* Deal Information */}
          <div className="card-elegant">
            <h3 className="text-lg font-semibold text-royal-ink dark:text-gray-100 mb-4">Deal Information</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="product" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Product/Service
                </label>
                <input
                  id="product"
                  type="text"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-royal-ink dark:focus:ring-antique-gold"
                  placeholder="36-month lease"
                />
              </div>

              <div>
                <label htmlFor="dealValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deal Value ($)
                </label>
                <input
                  id="dealValue"
                  type="number"
                  step="0.01"
                  value={formData.dealValue}
                  onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-royal-ink dark:focus:ring-antique-gold"
                  placeholder="21874.55"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="personalDetail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Personal Detail
              </label>
              <textarea
                id="personalDetail"
                rows={3}
                value={formData.personalDetail}
                onChange={(e) => setFormData({ ...formData, personalDetail: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-royal-ink dark:focus:ring-antique-gold"
                placeholder="They mentioned moving to St. George next month..."
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Any personal details from the call to include in the note
              </p>
            </div>
          </div>

          {/* Call Recording */}
          <div className="card-elegant">
            <h3 className="text-lg font-semibold text-royal-ink dark:text-gray-100 mb-4">Call Recording</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Audio File(s)
                </label>
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setAudioFiles(files);
                    setAudioUrl(''); // Clear URL if files are selected
                    setTranscript(''); // Clear transcript if files are selected
                  }}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-antique-gold/10 dark:file:bg-antique-gold/20 file:text-antique-gold-700 dark:file:text-antique-gold hover:file:bg-antique-gold/20 dark:hover:file:bg-antique-gold/30"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  MP3 or WAV files, max 50MB each. Select multiple files to create multiple notes at once.
                </p>
                {audioFiles.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <strong>{audioFiles.length} file{audioFiles.length !== 1 ? 's' : ''} selected:</strong>
                    <ul className="ml-4 mt-1 list-disc">
                      {audioFiles.map((file, idx) => (
                        <li key={idx}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">OR</span>
                </div>
              </div>

              <div>
                <label htmlFor="audioUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Audio File URL
                </label>
                <input
                  id="audioUrl"
                  type="url"
                  value={audioUrl}
                  onChange={(e) => {
                    setAudioUrl(e.target.value);
                    setAudioFiles([]); // Clear files if URL is entered
                    setTranscript(''); // Clear transcript if URL is entered
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-royal-ink dark:focus:ring-antique-gold"
                  placeholder="https://example.com/call-recording.mp3"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">OR</span>
                </div>
              </div>

              <div>
                <label htmlFor="transcript" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Paste Transcript
                </label>
                <textarea
                  id="transcript"
                  rows={8}
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    setAudioFiles([]); // Clear files if transcript is entered
                    setAudioUrl(''); // Clear URL if transcript is entered
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-royal-ink dark:focus:border-antique-gold focus:outline-none focus:ring-royal-ink dark:focus:ring-antique-gold font-mono text-sm"
                  placeholder="Paste the full call transcript here if you already have it..."
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  If you already have the transcript, you can paste it here instead of uploading audio
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link
              href="/dashboard"
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Note'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
