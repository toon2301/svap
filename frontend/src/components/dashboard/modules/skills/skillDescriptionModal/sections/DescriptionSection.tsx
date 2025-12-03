'use client';

import React, { useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DescriptionSectionProps {
  description: string;
  onChange: (value: string) => void;
  error: string;
  onErrorChange: (value: string) => void;
  isOpen: boolean;
}

export default function DescriptionSection({
  description,
  onChange,
  error,
  onErrorChange,
  isOpen,
}: DescriptionSectionProps) {
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (value: string) => {
    if (value.length <= 100) {
      onChange(value);
      onErrorChange('');
    }
  };

  const remainingChars = 100 - description.length;

  return (
    <div className="mb-2 relative">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={description}
          onChange={(e) => handleChange(e.target.value)}
          placeholder=""
          className="w-full px-3 pt-2 pb-6 pr-16 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent resize-none skill-description-textarea-scrollbar"
          rows={2}
          maxLength={100}
          autoFocus
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end pr-3 pb-2">
          <span
            className={`text-xs font-medium ${
              remainingChars < 10 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
            }`}
            aria-live="polite"
            aria-atomic="true"
            title={t('skills.charsSuffix', 'znakov')}
          >
            {remainingChars}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {t('skills.descriptionHint', 'Sem napíš krátky a výstižný popis.')}
      </p>
    </div>
  );
}

