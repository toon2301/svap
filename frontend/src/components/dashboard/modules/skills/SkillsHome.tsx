'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SkillsHomeProps {
  onOffer: () => void;
  onSearch: () => void;
}

export default function SkillsHome({ onOffer, onSearch }: SkillsHomeProps) {
  const { t } = useLanguage();

  return (
    <div className="text-[var(--foreground)]">
      <div className="hidden lg:block w-full">
        <div className="flex flex-col items-stretch w-full max-w-4xl mx-auto">
          <div className="w-full">
            <h2 className="text-[clamp(1.25rem,2vw,1.75rem)] font-semibold text-gray-800 dark:text-white mb-6">{t('profile.skills', 'Zručnosti')}</h2>
          </div>
          <div className="mt-4 w-full">
            <div className="border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="w-full py-8">
            <div className="flex flex-col gap-[clamp(1rem,2.5vw,1.5rem)] w-full">
              <button 
                type="button" 
                onClick={onOffer} 
                className="w-full h-[clamp(8rem,12vw,12rem)] flex items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="text-center">
                  <div className="text-[clamp(1.5rem,3vw,2rem)] font-extrabold text-gray-900 dark:text-white">{t('skills.offer', 'Ponúkam')}</div>
                  <div className="mx-auto mt-2 h-0.5 w-20 bg-gray-300 dark:bg-gray-700 rounded-full" />
                  <div className="mt-3 text-[clamp(0.75rem,1.2vw,0.875rem)] text-gray-700 dark:text-gray-300">{t('skills.offerCta', 'Ponúkaš zručnosť? Pridaj ju na Svaply kliknutím sem.')}</div>
                </div>
              </button>
              <button 
                type="button" 
                onClick={onSearch} 
                className="w-full h-[clamp(8rem,12vw,12rem)] flex items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--background)] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="text-center">
                  <div className="text-[clamp(1.5rem,3vw,2rem)] font-extrabold text-gray-900 dark:text-white">{t('skills.search', 'Hľadám')}</div>
                  <div className="mx-auto mt-2 h-0.5 w-20 bg-gray-300 dark:bg-gray-700 rounded-full" />
                  <div className="mt-3 text-[clamp(0.75rem,1.2vw,0.875rem)] text-gray-700 dark:text-gray-300">{t('skills.searchCta', 'Hľadáš zručnosť? Nájdi ju na Svaply kliknutím sem.')}</div>
                  <div className="mx-auto mt-2 h-0.5 w-24 bg-gray-300 dark:bg-gray-700 rounded-full" />
                  <div className="mt-3 text-[clamp(0.875rem,1.2vw,1rem)] text-gray-700 dark:text-gray-300">{t('skills.searchCta', 'Hľadáš zručnosť? Hľadaj ju na Svaply kliknutím sem.')}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


