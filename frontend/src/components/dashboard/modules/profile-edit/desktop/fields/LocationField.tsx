'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LocationFieldProps {
  location: string;
  setLocation: (v: string) => void;
  onSave: () => void;
}

export default function LocationField({ location, setLocation, onSave }: LocationFieldProps) {
  const { t } = useLanguage();
  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">{t('profile.location', 'Lokalita')}</label>
      <input
        id="location"
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        onBlur={onSave}
        onKeyDown={(e) => { if (e.key === 'Enter') { onSave(); } }}
        maxLength={100}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
        placeholder={t('profile.enterLocation', 'Zadajte svoje mesto alebo obec')}
      />
    </div>
  );
}


