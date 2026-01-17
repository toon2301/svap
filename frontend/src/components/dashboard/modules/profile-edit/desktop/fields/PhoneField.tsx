'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PhoneFieldProps {
  phone: string;
  setPhone: (v: string) => void;
  phoneVisible: boolean;
  onSave: () => void;
  onVisibleToggle: () => void;
}

export default function PhoneField({
  phone,
  setPhone,
  phoneVisible,
  onSave,
  onVisibleToggle,
}: PhoneFieldProps) {
  const { t } = useLanguage();

  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('profile.contact', 'Kontakt')}
      </label>
      <input
        id="phone"
        type="text"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onBlur={onSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSave();
          }
        }}
        maxLength={15}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
        placeholder={t('profile.phone', 'Tel. číslo')}
      />
      {/* Prepínač pre zobrazenie telefónu */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onVisibleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
            phoneVisible ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          style={{
            transform: 'scaleY(0.8)',
            transformOrigin: 'left center',
          }}
        >
          <span
            className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
              phoneVisible ? 'left-6' : 'left-1'
            }`}
          />
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('profile.showContactPublic', 'Skryť kontakt')}
        </span>
      </div>
    </div>
  );
}


