'use client';

import { useState, useRef, useEffect } from 'react';

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
  const [mounted, setMounted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    console.log('SignatureManager mounted!', { currentSignatureUrl });
    setMounted(true);
  }, [currentSignatureUrl]);

  // Native canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawing.current = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveDrawn = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Canvas not found');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const dataUrl = canvas.toDataURL('image/png');
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
    <div className="card-elegant">
      <h3 className="text-lg font-semibold text-royal-ink dark:text-gray-100 mb-4">Signature</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Draw or upload your signature to be included in your handwritten notes.
      </p>

      {/* Alert Messages */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-4">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 mb-4">
          <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* View Mode */}
      {mode === 'view' && (
        <div>
          {currentSignatureUrl ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Signature</label>
              </div>
              <div className="flex items-center justify-center rounded-md bg-gray-50 dark:bg-gray-900 p-4">
                <img
                  src={currentSignatureUrl}
                  alt="Your signature"
                  className="max-h-32 w-auto"
                />
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setMode('draw')}
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Draw New
                </button>
                <button
                  onClick={() => setMode('upload')}
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Upload New
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-md border border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
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
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No signature</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by drawing or uploading your signature
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    onClick={() => setMode('draw')}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-500"
                  >
                    Draw Signature
                  </button>
                  <button
                    onClick={() => setMode('upload')}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Draw Your Signature</label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Sign in the box below using your mouse or trackpad
            </p>
          </div>
          <div className="rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
            <canvas
              ref={canvasRef}
              width={600}
              height={160}
              className="w-full h-40 cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleClear}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Clear
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDrawn}
              disabled={isSaving}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Signature'}
            </button>
          </div>
        </div>
      )}

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload Signature Image</label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              PNG, JPG, or SVG format. Max file size: 2MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 dark:file:bg-blue-900/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
          />

          {uploadPreview && (
            <div className="mt-4 flex items-center justify-center rounded-md bg-gray-50 dark:bg-gray-900 p-4">
              <img
                src={uploadPreview}
                alt="Signature preview"
                className="max-h-32 w-auto"
              />
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveUpload}
              disabled={isSaving || !uploadPreview}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50"
            >
              {isSaving ? 'Uploading...' : 'Upload Signature'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
