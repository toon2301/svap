'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LocationSectionProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string;
  isSaving: boolean;
}

export default function LocationSection({ value, onChange, onBlur, error, isSaving }: LocationSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('skills.locationTitle', 'Miesto (voliteľné)')}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('skills.locationPlaceholder', 'Zadaj, kde ponúkaš svoje služby')}
        maxLength={25}
        onBlur={onBlur}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {t('skills.locationHint', 'Sem napíš, kde ponúkaš svoje služby a zručnosti.')}
      </p>
      {isSaving && (
        <p className="text-xs text-purple-600 dark:text-purple-300 mt-0.5">
          {t('skills.locationSaving', 'Ukladám miesto...')}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-0.5">
          {error}
        </p>
      )}
    </div>
  );
}

