'use client';

import { useState } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => void;
  originalDraft: string;
  editedText: string;
  notesSentCount: number;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  originalDraft,
  editedText,
  notesSentCount,
}: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('');
  const [selectedChanges, setSelectedChanges] = useState<string[]>([]);

  if (!isOpen) return null;

  const wasEdited = originalDraft !== editedText;
  const isLearningPhase = notesSentCount < 25;

  const commonChanges = [
    'Made it warmer/more personal',
    'Made it more professional',
    'Added specific details',
    'Removed unnecessary words',
    'Fixed grammar/typos',
    'Changed tone to match my style',
  ];

  const toggleChange = (change: string) => {
    if (selectedChanges.includes(change)) {
      setSelectedChanges(selectedChanges.filter(c => c !== change));
    } else {
      setSelectedChanges([...selectedChanges, change]);
    }
  };

  const handleSubmit = () => {
    const combinedFeedback = [
      ...selectedChanges,
      feedback.trim() ? `Other: ${feedback}` : '',
    ]
      .filter(Boolean)
      .join('; ');

    onSubmit(combinedFeedback);
    setFeedback('');
    setSelectedChanges([]);
  };

  const handleSkip = () => {
    onSubmit(''); // Submit empty feedback
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100" id="modal-title">
                {wasEdited ? 'Help Me Learn Your Style' : 'Approve Note'}
              </h3>
              <div className="mt-2">
                {wasEdited ? (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isLearningPhase ? (
                        <>You're on note {notesSentCount + 1} of 25. Your feedback helps the AI learn to write exactly like you!</>
                      ) : (
                        <>Your edits help improve future note generation. What did you change?</>
                      )}
                    </p>

                    {/* Quick select buttons */}
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 text-left">What did you change?</p>
                      <div className="flex flex-wrap gap-2">
                        {commonChanges.map((change) => (
                          <button
                            key={change}
                            onClick={() => toggleChange(change)}
                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                              selectedChanges.includes(change)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500'
                            }`}
                          >
                            {change}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Additional feedback */}
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 text-left mb-1">
                        Additional notes (optional)
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Anything else you changed or want the AI to know?"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You approved the AI-generated note without changes. Great! This helps the AI learn what good notes look like.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Progress indicator for learning phase */}
          {isLearningPhase && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 rounded-md p-3">
              <div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 mb-1">
                <span>Learning Progress</span>
                <span className="font-semibold">{notesSentCount + 1}/25 notes</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${((notesSentCount + 1) / 25) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-blue-700 dark:text-blue-400">
                {25 - (notesSentCount + 1)} more notes until AI learns your style completely
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={wasEdited && selectedChanges.length === 0 && !feedback.trim()}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {wasEdited ? 'Submit Feedback' : 'Approve'}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
            >
              Skip Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
