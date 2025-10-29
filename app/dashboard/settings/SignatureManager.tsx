'use client';

import { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import Image from 'next/image';

interface SignatureManagerProps {
  currentSignatureUrl?: string | null;
  onSave: (signatureData: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function SignatureManager({
  currentSignatureUrl,
  onSave,
  onDelete,
}: SignatureManagerProps) {
  const [mode, setMode] = useState<'view' | 'draw' | 'upload'>('view');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  const signatureRef = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    signatureRef.current?.clear();
  };

  const handleSaveDrawn = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError('Please draw your signature first');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const dataUrl = signatureRef.current.toDataURL('image/png');
      await onSave(dataUrl);
      setSuccess('Signature saved successfully!');
      setMode('view');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      setError('Please upload a PNG, JPG, or SVG image');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUpload = async () => {
    if (!uploadPreview) {
      setError('Please select an image first');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await onSave(uploadPreview);
      setSuccess('Signature uploaded successfully!');
      setMode('view');
      setUploadPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload signature');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your signature?')) return;

    setIsDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await onDelete();
      setSuccess('Signature deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete signature');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setMode('view');
    setUploadPreview(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Alert Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* View Mode */}
      {mode === 'view' && (
        <div className="space-y-4">
          {currentSignatureUrl ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700">Current Signature</label>
              </div>
              <div className="flex items-center justify-center rounded-md bg-gray-50 p-4">
                <Image
                  src={currentSignatureUrl}
                  alt="Your signature"
                  width={400}
                  height={150}
                  className="max-h-32 w-auto"
                />
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setMode('draw')}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Draw New
                </button>
                <button
                  onClick={() => setMode('upload')}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Upload New
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No signature</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by drawing or uploading your signature
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    onClick={() => setMode('draw')}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Draw Signature
                  </button>
                  <button
                    onClick={() => setMode('upload')}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Upload Image
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Draw Mode */}
      {mode === 'draw' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700">Draw Your Signature</label>
            <p className="mt-1 text-xs text-gray-500">
              Sign in the box below using your mouse or trackpad
            </p>
          </div>
          <div className="rounded-md border-2 border-dashed border-gray-300">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: 'w-full h-40 cursor-crosshair',
              }}
              backgroundColor="rgb(249, 250, 251)"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleClear}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDrawn}
              disabled={isSaving}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Signature'}
            </button>
          </div>
        </div>
      )}

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700">Upload Signature Image</label>
            <p className="mt-1 text-xs text-gray-500">
              PNG, JPG, or SVG format. Max file size: 2MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />

          {uploadPreview && (
            <div className="mt-4 flex items-center justify-center rounded-md bg-gray-50 p-4">
              <Image
                src={uploadPreview}
                alt="Signature preview"
                width={400}
                height={150}
                className="max-h-32 w-auto"
              />
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveUpload}
              disabled={isSaving || !uploadPreview}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Uploading...' : 'Upload Signature'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
