'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface GenderFieldProps {
  gender: string;
  onChange: (value: string) => void;
}

export default function GenderField({ gender, onChange }: GenderFieldProps) {
  const { t } = useLanguage();

  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('profile.gender', 'Pohlavie')}
      </label>
      <select
        id="gender"
        value={gender}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent appearance-none cursor-pointer"
      >
        <option value="">{t('profile.selectGender', 'Vyberte pohlavie')}</option>
        <option value="male">{t('profile.male', 'Muž')}</option>
        <option value="female">{t('profile.female', 'Žena')}</option>
        <option value="other">{t('profile.other', 'Iné')}</option>
      </select>
    </div>
  );
}


