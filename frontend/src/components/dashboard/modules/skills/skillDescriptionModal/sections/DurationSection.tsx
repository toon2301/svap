'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import DurationSelect from '../DurationSelect';
import { DurationOption } from '../types';

interface DurationSectionProps {
  value: DurationOption | '' | null;
  onChange: (value: DurationOption | '') => void;
}

export default function DurationSection({ value, onChange }: DurationSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('skills.duration', 'Trvanie')}
      </label>
      <div className="flex items-stretch h-11 border border-gray-300 dark:border-gray-700 rounded-lg overflow-visible focus-within:ring-1 focus-within:ring-purple-300 focus-within:border-purple-300 dark:focus-within:border-purple-500 transition-all hover:border-gray-400 dark:hover:border-gray-600 bg-white dark:bg-black">
        <DurationSelect value={value} onChange={onChange} />
      </div>
    </div>
  );
}

