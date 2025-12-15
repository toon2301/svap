'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface WebsitesFieldProps {
  user: User;
  website: string;
  additionalWebsites: string[];
  setWebsite: (v: string) => void;
  setAdditionalWebsites: (v: string[]) => void;
  onUserUpdate?: (u: User) => void;
}

export default function WebsitesField({ user, website, additionalWebsites, setWebsite, setAdditionalWebsites, onUserUpdate }: WebsitesFieldProps) {
  const { t } = useLanguage();

  const handleWebsiteSave = async () => {
    try {
      const response = await api.patch('/auth/profile/', { website: (website || '').trim() });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
    } catch (e) {
      console.error('Error saving website:', e);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">{t('profile.website', 'Web')}</label>
      <div className="relative mb-2">
        <input
          id="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          onBlur={handleWebsiteSave}
          onKeyDown={(e) => { if (e.key === 'Enter') { handleWebsiteSave(); } }}
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
            onBlur={async () => {
              // uloženie iba keď sa niečo zmenilo
              const filteredWebsites = additionalWebsites.filter((w) => (w || '').trim() !== '');
              const currentWebsites = user.additional_websites || [];
              if (JSON.stringify(filteredWebsites) !== JSON.stringify(currentWebsites)) {
                try {
                  const response = await api.patch('/auth/profile/', { additional_websites: filteredWebsites });
                  onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
                } catch (e) {
                  console.error('Error saving additional websites:', e);
                }
              }
            }}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                const filteredWebsites = additionalWebsites.filter((w) => (w || '').trim() !== '');
                const currentWebsites = user.additional_websites || [];
                if (JSON.stringify(filteredWebsites) !== JSON.stringify(currentWebsites)) {
                  try {
                    const response = await api.patch('/auth/profile/', { additional_websites: filteredWebsites });
                    onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
                  } catch (e) {
                    console.error('Error saving additional websites:', e);
                  }
                }
              }
            }}
            maxLength={255}
            className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            placeholder="https://example.com"
          />
          <button
            type="button"
            onClick={async () => {
              const newWebsites = additionalWebsites.filter((_, i) => i !== index);
              setAdditionalWebsites(newWebsites);
              const filteredWebsites = newWebsites.filter((w) => (w || '').trim() !== '');
              const currentWebsites = user.additional_websites || [];
              if (JSON.stringify(filteredWebsites) !== JSON.stringify(currentWebsites)) {
                try {
                  const response = await api.patch('/auth/profile/', { additional_websites: filteredWebsites });
                  onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
                } catch (e) {
                  console.error('Error saving additional websites:', e);
                }
              }
            }}
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


