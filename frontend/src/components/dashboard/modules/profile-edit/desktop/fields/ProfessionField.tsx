'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProfessionFieldProps {
  profession: string;
  setProfession: (v: string) => void;
  professionVisible: boolean;
  onSave: () => void;
  onVisibleToggle: () => void;
}

export default function ProfessionField({
  profession,
  setProfession,
  professionVisible,
  onSave,
  onVisibleToggle,
}: ProfessionFieldProps) {
  const { t } = useLanguage();

  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('profile.profession', 'Profesia')}
      </label>
      <input
        id="profession"
        type="text"
        value={profession}
        onChange={(e) => setProfession(e.target.value)}
        onBlur={onSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSave();
          }
        }}
        maxLength={100}
        className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
        placeholder={t('profile.enterProfession', 'Zadajte svoju profesiu')}
      />
      {/* Prepínač pre zobrazenie profese */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onVisibleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
            professionVisible ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          style={{
            transform: 'scaleY(0.8)',
            transformOrigin: 'left center',
          }}
        >
          <span
            className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
              professionVisible ? 'left-6' : 'left-1'
            }`}
          />
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('profile.showProfessionPublic', 'Skryť profesiu')}
        </span>
      </div>
    </div>
  );
}


