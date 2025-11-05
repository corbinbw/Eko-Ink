'use client';

import { useTheme } from '@/lib/theme-provider';

export default function ThemeToggle() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="card-elegant">
      <h3 className="text-lg font-semibold text-royal-ink dark:text-gray-100 mb-4">Appearance</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        EkoInk automatically matches your system's appearance settings.
      </p>

      <div className="p-4 rounded-lg border-2 border-antique-gold bg-antique-gold/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700">
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-royal-ink dark:text-gray-100">System Theme</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Currently using {resolvedTheme === 'dark' ? 'dark' : 'light'} mode
            </p>
          </div>
          <svg className="w-5 h-5 text-antique-gold" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Change your system's appearance settings to switch between light and dark mode.
      </p>
    </div>
  );
}
