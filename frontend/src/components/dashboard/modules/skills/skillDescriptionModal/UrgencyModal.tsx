'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../../profile-edit/shared/MobileFullScreenModal';

interface UrgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (urgency: 'low' | 'medium' | 'high') => void;
  initialValue?: 'low' | 'medium' | 'high' | '';
}

export default function UrgencyModal({
  isOpen,
  onClose,
  onSave,
  initialValue = 'low',
}: UrgencyModalProps) {
  const { t } = useLanguage();
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>(initialValue || 'low');

  useEffect(() => {
    if (isOpen) {
      setUrgency(initialValue || 'low');
    }
  }, [isOpen, initialValue]);

  const handleSave = () => {
    onSave(urgency);
  };

  const urgencyOptions = [
    { key: 'low' as const, label: t('skills.urgencyLow', 'Nízka') },
    { key: 'medium' as const, label: t('skills.urgencyMedium', 'Stredná') },
    { key: 'high' as const, label: t('skills.urgencyHigh', 'Vysoká') },
  ];

  return (
    <MobileFullScreenModal
      isOpen={isOpen}
      title={t('skills.urgency', 'Urgentnosť')}
      onBack={onClose}
      onSave={handleSave}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('skills.urgencyInfo', 'Zadaj, ako urgentne hľadáš službu alebo zručnosť.')}
        </p>
        
        <div className="space-y-3">
          {urgencyOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setUrgency(option.key)}
              className={`w-full px-4 py-4 rounded-lg border-2 text-left transition-colors ${
                urgency === option.key
                  ? option.key === 'low'
                    ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
                    : option.key === 'medium'
                      ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700'
                      : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-[#0f0f10] dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">{option.label}</span>
                {urgency === option.key && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className={`w-6 h-6 ${
                      option.key === 'low'
                        ? 'text-green-700 dark:text-green-200'
                        : option.key === 'medium'
                          ? 'text-amber-700 dark:text-amber-200'
                          : 'text-red-700 dark:text-red-200'
                    }`}
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

