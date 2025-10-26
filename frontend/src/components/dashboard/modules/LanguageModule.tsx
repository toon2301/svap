'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageModule() {
  const { locale, setLocale, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(
    locale === 'en' ? 'angličtina' : locale === 'pl' ? 'poľština' : locale === 'cs' ? 'čeština' : locale === 'de' ? 'nemčina' : locale === 'hu' ? 'maďarčina' : 'slovenčina'
  );

  const languages = [
    'slovenčina',
    'čeština', 
    'angličtina',
    'nemčina',
    'poľština',
    'maďarčina'
  ];

  return (
    <div className="text-[var(--foreground)]">
      {/* Desktop layout - restore original */}
      <div className="hidden lg:block pt-4 pb-8 pl-12">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 text-center -ml-[31rem]">
          {t('language.title', 'Jazyk')}
        </h2>
        <p className="text-gray-800 dark:text-white text-center -ml-[31rem] mb-2 text-lg font-semibold ml-[-28rem]">
          {t('language.languageSelection', 'Výber jazyka')}
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-center -ml-[7.5rem] mb-6 text-sm">
          {t('language.selectLanguage', 'Zvoľte si jazyk, v ktorom sa vám bude aplikácia najlepšie používať.')}
        </p>
        <div className="mt-6 mx-auto w-full max-w-[50rem]">
          <div className="border-t border-gray-200 dark:border-gray-700"></div>
        </div>
        <div className="text-center mt-8">
          <div className="space-y-8 max-w-md mx-auto -ml-[-39rem]">
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

      {/* Mobile layout - compact, pretty */}
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
    </div>
  );
}
