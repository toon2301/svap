'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../../profile-edit/shared/MobileFullScreenModal';
import { DurationOption } from './types';

interface DurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (duration: DurationOption | '') => void;
  initialValue?: DurationOption | '' | null;
}

export default function DurationModal({
  isOpen,
  onClose,
  onSave,
  initialValue = null,
}: DurationModalProps) {
  const { t } = useLanguage();
  const [duration, setDuration] = useState<DurationOption | ''>(initialValue || '');

  useEffect(() => {
    if (isOpen) {
      setDuration(initialValue || '');
    }
  }, [isOpen, initialValue]);

  const handleSave = () => {
    onSave(duration);
  };

  const durationOptions = [
    { key: 'one_time' as const, label: t('skills.durationOneTime', 'Jednorazovo') },
    { key: 'long_term' as const, label: t('skills.durationLongTerm', 'Dlhodobo') },
    { key: 'project' as const, label: t('skills.durationProject', 'Zákazka') },
  ];

  return (
    <MobileFullScreenModal
      isOpen={isOpen}
      title={t('skills.duration', 'Trvanie')}
      onBack={onClose}
      onSave={handleSave}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('skills.durationInfo', 'Vyber, aké trvanie má mať služba alebo zručnosť.')}
        </p>
        
        <div className="space-y-3">
          <button
            role="option"
            aria-selected={!duration}
            onClick={() => setDuration('')}
            className={`w-full px-4 py-4 rounded-lg border-2 text-left transition-colors ${
              !duration
                ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-[#0f0f10] dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-base">{t('skills.selectDuration', 'Vyber trvanie')}</span>
              {!duration && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-purple-700 dark:text-purple-200"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
          </button>
          {durationOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setDuration(option.key)}
              className={`w-full px-4 py-4 rounded-lg border-2 text-left transition-colors ${
                duration === option.key
                  ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-[#0f0f10] dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">{option.label}</span>
                {duration === option.key && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-6 h-6 text-purple-700 dark:text-purple-200"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </MobileFullScreenModal>
  );
}

