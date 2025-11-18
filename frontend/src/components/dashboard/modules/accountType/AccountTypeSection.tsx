'use client';
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  accountType: 'personal' | 'business';
  setAccountType: (v: 'personal' | 'business') => void;
  setIsAccountTypeModalOpen: (v: boolean) => void;
  setIsPersonalAccountModalOpen: (v: boolean) => void;
};

export default function AccountTypeSection({
  accountType,
  setAccountType,
  setIsAccountTypeModalOpen,
  setIsPersonalAccountModalOpen,
}: Props) {
  const { t } = useLanguage();
  return (
    <div className="text-[var(--foreground)]">
      {/* Desktop layout */}
      <div className="hidden lg:flex items-start justify-center">
        <div className="flex flex-col items-start w-full max-w-3xl mx-auto">
          <div className="w-full ml-8 lg:ml-12">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
              {t('rightSidebar.accountType', 'Typ účtu')}
            </h2>
            <p className="text-gray-800 dark:text-white text-lg font-semibold mb-4">
              {t('accountType.selectAccountType', 'Zvoľ typ účtu')}
            </p>
          </div>
          <div className="mt-6 w-full max-w-6xl mx-auto"><div className="border-t border-gray-200 dark:border-gray-700" /></div>
          {/* Obsah sekcie Typ účtu */}
          <div className="mt-8 w-full max-w-lg mx-auto">
            <div className="space-y-4">
              <button onClick={() => setAccountType('personal')} className={`w-full py-4 px-6 rounded-lg transition-colors ${
                accountType === 'personal'
                  ? 'border-2 border-black dark:border-white'
                  : 'border-2 border-gray-300 dark:border-gray-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-semibold text-lg mb-1 text-gray-800 dark:text-white">
                      {t('accountType.personal', 'Osobný účet')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('accountType.personalDesc', 'Pre jednotlivcov a osobné použitie')}
                    </div>
                  </div>
                  {accountType === 'personal' && (
                    <svg className="w-5 h-5 text-gray-800 dark:text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
              <button onClick={() => setIsAccountTypeModalOpen(true)} className={`w-full py-4 px-6 rounded-lg transition-colors ${
                accountType === 'business'
                  ? 'border-2 border-black dark:border-white'
                  : 'border-2 border-gray-300 dark:border-gray-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-semibold text-lg mb-1 text-gray-800 dark:text-white">
                      {t('accountType.business', 'Firemný účet')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('accountType.businessDesc', 'Pre firmy a profesionálne použitie')}
                    </div>
                  </div>
                  {accountType === 'business' && (
                    <svg className="w-5 h-5 text-gray-800 dark:text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile layout */}
      <div className="block lg:hidden px-4 pt-2 pb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('rightSidebar.accountType', 'Typ účtu')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('accountType.selectAccountType', 'Zvoľ typ účtu')}
        </p>
        <div className="space-y-3">
          <button onClick={() => setAccountType('personal')} className={`w-full py-4 px-6 rounded-lg transition-colors ${
            accountType === 'personal'
              ? 'border-2 border-black dark:border-white'
              : 'border-2 border-gray-300 dark:border-gray-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="font-semibold text-base mb-1 text-gray-800 dark:text-white">
                  {t('accountType.personal', 'Osobný účet')}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('accountType.personalDesc', 'Pre jednotlivcov a osobné použitie')}
                </div>
              </div>
              {accountType === 'personal' && (
                <svg className="w-4 h-4 text-gray-800 dark:text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
          <button onClick={() => setAccountType('business')} className={`w-full py-4 px-6 rounded-lg transition-colors ${
            accountType === 'business'
              ? 'border-2 border-black dark:border-white'
              : 'border-2 border-gray-300 dark:border-gray-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="font-semibold text-base mb-1 text-gray-800 dark:text-white">
                  {t('accountType.business', 'Firemný účet')}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('accountType.businessDesc', 'Pre firmy a profesionálne použitie')}
                </div>
              </div>
              {accountType === 'business' && (
                <svg className="w-4 h-4 text-gray-800 dark:text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

