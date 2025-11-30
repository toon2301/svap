'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageModule() {
  const { locale, setLocale, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(
    locale === 'en' ? 'angličtina' : locale === 'pl' ? 'poľština' : locale === 'cs' ? 'čeština' : locale === 'de' ? 'nemčina' : locale === 'hu' ? 'maďarčina' : 'slovenčina'
  );
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
      // Malé desktopy: 1024px < width <= 1440px (napr. 1280×720, 1366×768)
      setIsSmallDesktop(width > 1024 && width <= 1440);
    };
    
    checkSmallDesktop();
    window.addEventListener('resize', checkSmallDesktop);
    return () => window.removeEventListener('resize', checkSmallDesktop);
  }, []);

  const languages = [
    'slovenčina',
    'čeština', 
    'angličtina',
    'nemčina',
    'poľština',
    'maďarčina'
  ];

  return (
    <>
      {/* Desktop layout */}
      <div className="text-[var(--foreground)]">
        <div className="hidden lg:flex items-start justify-center">
          <div 
            className="flex flex-col items-start w-full mx-auto"
            style={{
              maxWidth: isSmallDesktop ? '520px' : '768px', // max-w-3xl = 768px
              marginLeft: isSmallDesktop ? '120px' : undefined
            }}
          >
            <div 
              className="w-full"
              style={{
                marginLeft: isSmallDesktop ? '0' : undefined
              }}
            >
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
                {t('language.title', 'Jazyk')}
              </h2>
              <p className="text-gray-800 dark:text-white mb-2 text-lg font-semibold">
                {t('language.languageSelection', 'Výber jazyka')}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                {t('language.selectLanguage', 'Zvoľte si jazyk, v ktorom sa vám bude aplikácia najlepšie používať.')}
              </p>
            </div>
            <div className="w-full max-w-6xl mx-auto" style={{ marginTop: isSmallDesktop ? '1rem' : '1.5rem' }}>
              <div className="border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="w-full" style={{ marginTop: isSmallDesktop ? '1rem' : '2rem' }}>
              <div className="w-full mx-auto" style={{ maxWidth: isSmallDesktop ? '520px' : '512px', gap: isSmallDesktop ? '1rem' : undefined }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: isSmallDesktop ? '1rem' : '2rem' }}>
                {languages.map((language) => (
                <div key={language} className="flex items-center justify-between">
                  <span className="text-gray-800 dark:text-white text-sm font-medium">
                    {(() => {
                      if (language === 'slovenčina') return t('language.slovak', 'Slovenčina');
                      if (language === 'čeština') return t('language.czech', 'Čeština');
                      if (language === 'angličtina') return t('language.english', 'Angličtina');
                      if (language === 'nemčina') return t('language.german', 'Nemčina');
                      if (language === 'poľština') return t('language.polish', 'Poľština');
                      if (language === 'maďarčina') return t('language.hungarian', 'Maďarčina');
                      return language;
                    })()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = language;
                      setSelectedLanguage(next);
                      if (next === 'angličtina') setLocale('en');
                      if (next === 'slovenčina') setLocale('sk');
                      if (next === 'poľština') setLocale('pl');
                      if (next === 'čeština') setLocale('cs');
                      if (next === 'nemčina') setLocale('de');
                      if (next === 'maďarčina') setLocale('hu');
                    }}
                    onPointerDown={(e) => { e.preventDefault(); }}
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      selectedLanguage === language
                        ? 'bg-black border border-white'
                        : 'bg-transparent border-2 border-gray-300 dark:border-gray-600'
                    }`}
                    tabIndex={-1}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {selectedLanguage === language && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
                ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="block lg:hidden px-4 pt-2 pb-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('language.title', 'Jazyk')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('language.selectLanguage', 'Zvoľte si jazyk, v ktorom sa vám bude aplikácia najlepšie používať.')}
          </p>
        </div>
        <div className="space-y-0">
          {languages.map((language, index) => (
            <div key={language}>
              {index > 0 && <div className='border-t border-gray-200 dark:border-gray-700'></div>}
              <button
                type="button"
                onClick={() => {
                  const next = language;
                  setSelectedLanguage(next);
                  if (next === 'angličtina') setLocale('en');
                  if (next === 'slovenčina') setLocale('sk');
                  if (next === 'poľština') setLocale('pl');
                  if (next === 'čeština') setLocale('cs');
                  if (next === 'nemčina') setLocale('de');
                  if (next === 'maďarčina') setLocale('hu');
                }}
                onPointerDown={(e) => { e.preventDefault(); }}
                className="w-full flex items-center justify-between p-4 transition-all duration-200 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ring-0"
                tabIndex={-1}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className={`text-sm font-medium ${
                  selectedLanguage === language
                    ? 'text-black dark:text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {(() => {
                    if (language === 'slovenčina') return t('language.slovak', 'Slovenčina');
                    if (language === 'čeština') return t('language.czech', 'Čeština');
                    if (language === 'angličtina') return t('language.english', 'Angličtina');
                    if (language === 'nemčina') return t('language.german', 'Nemčina');
                    if (language === 'poľština') return t('language.polish', 'Poľština');
                    if (language === 'maďarčina') return t('language.hungarian', 'Maďarčina');
                    return language;
                  })()}
                </span>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  selectedLanguage === language
                    ? 'bg-black border border-white'
                    : 'bg-transparent border-2 border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedLanguage === language && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
