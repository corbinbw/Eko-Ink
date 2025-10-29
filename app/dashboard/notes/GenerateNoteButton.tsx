'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GenerateNoteButton({ noteId }: { noteId: string }) {
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    try {
      setGenerating(true);

      const response = await fetch(`/api/notes/${noteId}/generate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to generate note'}`);
        return;
      }

      alert('Note generated successfully!');
      router.refresh();
    } catch (error: any) {
      console.error('Error generating note:', error);
      alert(`Error: ${error.message || 'Failed to generate note'}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {generating ? 'Generating...' : 'Generate Note'}
    </button>
  );
}
