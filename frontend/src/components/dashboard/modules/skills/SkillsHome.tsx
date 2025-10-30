'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SkillsHomeProps {
  onOffer: () => void;
  onSearch: () => void;
}

export default function SkillsHome({ onOffer, onSearch }: SkillsHomeProps) {
  const { t } = useLanguage();
  return (
    <div className="text-[var(--foreground)]">
      <div className="hidden lg:flex items-start justify-center">
        <div className="flex flex-col items-start w-full max-w-3xl mx-auto">
          <div className="w-full ml-8 lg:ml-12">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">{t('profile.skills', 'Zručnosti')}</h2>
          </div>
          <div className="mt-6 w-full"><div className="border-t border-gray-200 dark:border-gray-700" /></div>
          <div className="w-full ml-8 lg:ml-12 py-10">
            <div className="flex flex-col gap-6 max-w-3xl pr-8">
              <button type="button" onClick={onOffer} className="w-full max-w-2xl h-56 flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <div className="text-center">
                  <div className="text-4xl font-extrabold text-gray-900 dark:text-white">{t('skills.offer', 'Ponúkam')}</div>
                  <div className="mx-auto mt-2 h-0.5 w-24 bg-gray-300 dark:bg-gray-700 rounded-full" />
                  <div className="mt-3 text-base text-gray-700 dark:text-gray-300">{t('skills.offerCta', 'Ponúkaš zručnosť? Pridaj ju na Svaply kliknutím sem.')}</div>
                </div>
              </button>
              <button type="button" onClick={onSearch} className="w-full max-w-2xl h-56 flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <div className="text-center">
                  <div className="text-4xl font-extrabold text-gray-900 dark:text-white">{t('skills.search', 'Hľadám')}</div>
                  <div className="mx-auto mt-2 h-0.5 w-24 bg-gray-300 dark:bg-gray-700 rounded-full" />
                  <div className="mt-3 text-base text-gray-700 dark:text-gray-300">{t('skills.searchCta', 'Hľadáš zručnosť? Hľadaj ju na Svaply kliknutím sem.')}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


