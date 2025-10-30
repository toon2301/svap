'use client';

import React from 'react';

interface SkillsScreenProps {
  title: string;
  firstOptionText?: string;
  onFirstOptionClick?: () => void;
}

export default function SkillsScreen({ title, firstOptionText, onFirstOptionClick }: SkillsScreenProps) {
  return (
    <div className="text-[var(--foreground)]">
      <div className="hidden lg:flex items-start justify-center">
        <div className="flex flex-col items-start w-full max-w-3xl mx-auto">
          <div className="w-full ml-8 lg:ml-12">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">{title}</h2>
          </div>
          <div className="mt-6 w-full"><div className="border-t border-gray-200 dark:border-gray-700" /></div>
          <div className="w-full ml-8 lg:ml-12 py-10 text-gray-500 dark:text-gray-400">
            {firstOptionText && (
              <button type="button" onClick={onFirstOptionClick} className="w-full max-w-2xl -mt-6 py-4 px-3 flex items-center justify-between text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors">
                <span className="text-lg font-medium">{firstOptionText}</span>
                <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


