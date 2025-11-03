'use client';

import React, { useState, useEffect } from 'react';

interface SkillDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  subcategory: string;
  onSave: (description: string) => void;
  initialDescription?: string;
}

export default function SkillDescriptionModal({ 
  isOpen, 
  onClose, 
  category, 
  subcategory, 
  onSave,
  initialDescription = ''
}: SkillDescriptionModalProps) {
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setDescription(initialDescription || '');
      setError('');
    } else {
      setDescription('');
      setError('');
    }
  }, [isOpen, initialDescription]);

  const handleSave = () => {
    const trimmed = description.trim();
    
    if (!trimmed) {
      setError('Popis zručnosti je povinný');
      return;
    }

    if (trimmed.length > 75) {
      setError('Popis zručnosti môže mať maximálne 75 znakov');
      return;
    }

    onSave(trimmed);
    // Modal sa zatvorí automaticky v Dashboard.tsx cez setIsSkillDescriptionModalOpen(false)
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 75) {
      setDescription(value);
      setError('');
    }
  };

  if (!isOpen) return null;

  const remainingChars = 75 - description.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <h2 className="text-xl font-semibold">Opíš svoju zručnosť</h2>
            <button 
              aria-label="Close" 
              onClick={onClose} 
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 pb-4">
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-medium text-gray-800 dark:text-gray-200">{category}</span>
                <span className="mx-2">→</span>
                <span className="text-gray-700 dark:text-gray-300">{subcategory}</span>
              </p>
            </div>

            <div className="mb-2">
              <textarea
                value={description}
                onChange={handleChange}
                placeholder=""
                className="w-full px-3 py-2 pr-16 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent resize-none"
                rows={4}
                maxLength={75}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex-1">
                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}
                </div>
                <p className={`text-xs ${remainingChars < 10 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  {remainingChars} znakov
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!description.trim()}
              >
                Pridať
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

