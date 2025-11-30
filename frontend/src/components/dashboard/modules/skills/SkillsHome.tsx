'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SkillsHomeProps {
  onOffer: () => void;
  onSearch: () => void;
}

export default function SkillsHome({ onOffer, onSearch }: SkillsHomeProps) {
  const { t } = useLanguage();
  const [isSmallDesktop, setIsSmallDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      return width > 1024 && width <= 1440;
    }
    return false;
  });

  useEffect(() => {
    const checkSmallDesktop = () => {
      const width = window.innerWidth;
      setIsSmallDesktop(width > 1024 && width <= 1440);
    };
    
    checkSmallDesktop();
    window.addEventListener('resize', checkSmallDesktop);
    return () => window.removeEventListener('resize', checkSmallDesktop);
  }, []);

  const containerWidth = isSmallDesktop ? '42rem' : '56rem';
  const marginLeft = isSmallDesktop ? '11rem' : '6rem';
  const buttonHeight = isSmallDesktop ? '12rem' : '14rem';
  const titleSize = isSmallDesktop ? 'text-xl' : 'text-2xl';
  const buttonTextSize = isSmallDesktop ? 'text-3xl' : 'text-4xl';
  const descriptionTextSize = isSmallDesktop ? 'text-sm' : 'text-base';

  return (
    <div className="text-[var(--foreground)]">
      <div className="hidden lg:block w-full">
        <div className="flex flex-col items-stretch w-full">
          <div className="w-full max-w-3xl" style={{ marginLeft }}>
            <h2 className={`${titleSize} font-semibold text-gray-800 dark:text-white mb-2`}>{t('profile.skills', 'Zručnosti')}</h2>
          </div>
          <div className="mt-6" style={{ marginLeft, width: containerWidth, maxWidth: containerWidth }}><div className="border-t border-gray-200 dark:border-gray-700" /></div>
          <div className="w-full py-10">
            <div className="flex flex-col gap-6" style={{ marginLeft, width: containerWidth, maxWidth: containerWidth }}>
              <button type="button" onClick={onOffer} className="w-full flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors" style={{ height: buttonHeight }}>
                <div className="text-center">
                  <div className={`${buttonTextSize} font-extrabold text-gray-900 dark:text-white`}>{t('skills.offer', 'Ponúkam')}</div>
                  <div className="mx-auto mt-2 h-0.5 w-24 bg-gray-300 dark:bg-gray-700 rounded-full" />
                  <div className={`mt-3 ${descriptionTextSize} text-gray-700 dark:text-gray-300`}>{t('skills.offerCta', 'Ponúkaš zručnosť? Pridaj ju na Svaply kliknutím sem.')}</div>
                </div>
              </button>
              <button type="button" onClick={onSearch} className="w-full flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors" style={{ height: buttonHeight }}>
                <div className="text-center">
                  <div className={`${buttonTextSize} font-extrabold text-gray-900 dark:text-white`}>{t('skills.search', 'Hľadám')}</div>
                  <div className="mx-auto mt-2 h-0.5 w-24 bg-gray-300 dark:bg-gray-700 rounded-full" />
                  <div className={`mt-3 ${descriptionTextSize} text-gray-700 dark:text-gray-300`}>{t('skills.searchCta', 'Hľadáš zručnosť? Hľadaj ju na Svaply kliknutím sem.')}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


