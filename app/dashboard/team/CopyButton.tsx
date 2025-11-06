'use client';

import { useState } from 'react';

export default function CopyButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-4 py-2 bg-royal-ink dark:bg-antique-gold text-white dark:text-gray-900 text-sm font-semibold rounded-md hover:bg-royal-ink-600 dark:hover:bg-antique-gold-600 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}
