'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BusinessFieldsSectionProps {
  ico: string;
  setIco: (v: string) => void;
  icoVisible: boolean;
  onIcoSave: () => void;
  onIcoVisibleToggle: () => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  onContactEmailSave: () => void;
}

export default function BusinessFieldsSection({
  ico,
  setIco,
  icoVisible,
  onIcoSave,
  onIcoVisibleToggle,
  contactEmail,
  setContactEmail,
  onContactEmailSave,
}: BusinessFieldsSectionProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* IČO - iba pre firemné účty */}
      <div className="mb-4">
        <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
          IČO
        </label>
        <input
          id="ico"
          type="text"
          value={ico}
          onChange={(e) => {
            // Povoliť iba číslice
            const value = e.target.value.replace(/\D/g, '');
            if (value.length <= 14) {
              setIco(value);
            }
          }}
          onBlur={onIcoSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onIcoSave();
            }
          }}
          maxLength={14}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder="12345678901234"
        />
        {/* Prepínač pre zobrazenie IČO */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onIcoVisibleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              icoVisible ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            style={{
              transform: 'scaleY(0.8)',
              transformOrigin: 'left center',
            }}
          >
            <span
              className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                icoVisible ? 'left-6' : 'left-1'
              }`}
            />
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('profile.hideIco', 'Skryť IČO')}
          </span>
        </div>
      </div>

      {/* Kontaktný Email - len pre firemný účet */}
      <div className="mb-4">
        <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email
        </label>
        <input
          id="contactEmail"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          onBlur={onContactEmailSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onContactEmailSave();
            }
          }}
          maxLength={50}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder="kontakt@firma.sk"
        />
      </div>
    </>
  );
}


