'use client';

import React from 'react';
import type { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface WebsitesFieldProps {
  editableUser: User;
  website: string;
  additionalWebsites: string[];
  setWebsite: (v: string) => void;
  setAdditionalWebsites: (v: string[]) => void;
  onEditableUserUpdate: (partial: Partial<User>) => void;
}

export default function WebsitesField({
  editableUser,
  website,
  additionalWebsites,
  setWebsite,
  setAdditionalWebsites,
  onEditableUserUpdate,
}: WebsitesFieldProps) {
  const { t } = useLanguage();

  const handleWebsiteBlur = () => {
    const trimmed = (website || '').trim();
    onEditableUserUpdate({
      website: trimmed,
    });
  };

  const handleAdditionalWebsitesBlur = () => {
    const filtered = additionalWebsites.filter((w) => (w || '').trim() !== '');
    const current = editableUser.additional_websites || [];
    if (JSON.stringify(filtered) !== JSON.stringify(current)) {
      onEditableUserUpdate({ additional_websites: filtered });
    }
  };

  const handleRemoveAdditional = (index: number) => {
    const newWebsites = additionalWebsites.filter((_, i) => i !== index);
    setAdditionalWebsites(newWebsites);
    const filtered = newWebsites.filter((w) => (w || '').trim() !== '');
    onEditableUserUpdate({ additional_websites: filtered });
  };

  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('profile.website', 'Web')}
      </label>
      <div className="relative mb-2">
        <input
          id="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          onBlur={handleWebsiteBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleWebsiteBlur();
          }}
          maxLength={255}
          className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder="https://example.com"
        />
        <button
          type="button"
          onClick={() => {
            const mainCount = (website || '').trim() ? 1 : 0;
            const total = mainCount + additionalWebsites.length;
            if (total >= 5) return;
            setAdditionalWebsites([...additionalWebsites, '']);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {additionalWebsites.map((additionalWebsite, index) => (
        <div key={index} className="relative mb-2">
          <input
            type="url"
            value={additionalWebsite}
            onChange={(e) => {
              const newWebsites = [...additionalWebsites];
              newWebsites[index] = e.target.value;
              setAdditionalWebsites(newWebsites);
            }}
            onBlur={handleAdditionalWebsitesBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdditionalWebsitesBlur();
            }}
            maxLength={255}
            className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            placeholder="https://example.com"
          />
          <button
            type="button"
            onClick={() => handleRemoveAdditional(index)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
