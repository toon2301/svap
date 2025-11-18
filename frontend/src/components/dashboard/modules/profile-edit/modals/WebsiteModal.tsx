'use client';

import React from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';

interface WebsiteModalProps {
  isOpen: boolean;
  website: string;
  additionalWebsites: string[];
  originalWebsite: string;
  originalAdditionalWebsites: string[];
  setWebsite: (v: string) => void;
  setAdditionalWebsites: (v: string[]) => void;
  setOriginalWebsite?: (v: string) => void;
  setOriginalAdditionalWebsites?: (v: string[]) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
}

export default function WebsiteModal({ isOpen, website, additionalWebsites, originalWebsite, originalAdditionalWebsites, setWebsite, setAdditionalWebsites, setOriginalWebsite, setOriginalAdditionalWebsites, onClose, onUserUpdate }: WebsiteModalProps) {
  const { t } = useLanguage();
  const safeAdditionalWebsites = Array.isArray(additionalWebsites) ? additionalWebsites : [];
  const safeOriginalAdditionalWebsites = Array.isArray(originalAdditionalWebsites) ? originalAdditionalWebsites : [];

  const handleSave = async () => {
    try {
      const main = (website || '').trim();
      let extras = safeAdditionalWebsites.filter((w) => (w || '').trim());
      const mainCount = main ? 1 : 0;
      const allowedAdditional = Math.max(0, 5 - mainCount);
      if (extras.length > allowedAdditional) {
        extras = extras.slice(0, allowedAdditional);
        setAdditionalWebsites(extras);
      }
      const response = await api.patch('/auth/profile/', { website: main, additional_websites: extras });
      onUserUpdate && response.data?.user && onUserUpdate(response.data.user);
      setOriginalWebsite && setOriginalWebsite(main);
      setOriginalAdditionalWebsites && setOriginalAdditionalWebsites(extras);
      onClose();
    } catch (e) {
      console.error('Chyba pri ukladaní webu:', e);
    }
  };

  const handleBack = () => {
    setWebsite(originalWebsite);
    setAdditionalWebsites(safeOriginalAdditionalWebsites);
    onClose();
  };

  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.website', 'Web')} onBack={handleBack} onSave={handleSave}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.website', 'Web')}</label>
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            maxLength={255}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            placeholder="https://example.com"
          />
          <button
            onClick={() => {
              const mainCount = (website || '').trim() ? 1 : 0;
              const total = mainCount + safeAdditionalWebsites.length;
              if (total >= 5) return;
              setAdditionalWebsites([...safeAdditionalWebsites, '']);
            }}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>
      {safeAdditionalWebsites.map((additionalWebsite, index) => (
        <div key={index} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Web {index + 2}</label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={additionalWebsite}
              onChange={(e) => {
                const newWebsites = [...safeAdditionalWebsites];
                newWebsites[index] = e.target.value;
                setAdditionalWebsites(newWebsites);
              }}
              maxLength={255}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
              placeholder="https://example.com"
            />
            <button
              onClick={() => {
                const newWebsites = safeAdditionalWebsites.filter((_, i) => i !== index);
                setAdditionalWebsites(newWebsites);
              }}
              className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.websiteDescription', 'Zadajte URL vašej webovej stránky, portfólia alebo ľubovoľného odkazu, ktorý chcete zdieľať s ostatnými používateľmi.')}</p>
      </div>
    </MobileFullScreenModal>
  );
}


