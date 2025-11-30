'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

// Falošná zmena pre push

interface AccountTypeModuleProps {
  accountType: 'personal' | 'business';
  setAccountType: (type: 'personal' | 'business') => void;
  setIsAccountTypeModalOpen: (open: boolean) => void;
  setIsPersonalAccountModalOpen: (open: boolean) => void;
}

export default function AccountTypeModule({ accountType, setAccountType, setIsAccountTypeModalOpen, setIsPersonalAccountModalOpen }: AccountTypeModuleProps) {
  const { t } = useLanguage();
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [isSmallDesktop, setIsSmallDesktop] = useState(false);

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

  return (
    <div className="text-[var(--foreground)]">
      {/* Desktop layout */}
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
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
              {t('rightSidebar.accountType', 'Typ účtu')}
            </h2>
            <p className="text-gray-800 dark:text-white text-lg font-semibold mb-4">
              {t('accountType.selectAccountType', 'Zvoľ typ účtu')}
            </p>
          </div>
          <div className="w-full max-w-6xl mx-auto" style={{ marginTop: isSmallDesktop ? '1rem' : '1.5rem' }}><div className="border-t border-gray-200 dark:border-gray-700" /></div>
          {/* Obsah sekcie Typ účtu */}
          <div className="w-full mx-auto" style={{ maxWidth: isSmallDesktop ? '520px' : '512px', marginTop: isSmallDesktop ? '1rem' : '2rem' }}>
            <div className="space-y-4">
                  <button onClick={() => setIsPersonalAccountModalOpen(true)} className={`w-full py-4 px-6 rounded-lg transition-colors ${
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
        <div className="space-y-4">
          <button
            onClick={() => setIsMobileModalOpen(true)}
            className="w-full flex items-center justify-between py-4 px-4 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors rounded-lg"
          >
            <div className="text-base font-medium">
              Prepnúť typ účtu
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>
      </div>

      {/* Mobile Modal */}
      {isMobileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setIsMobileModalOpen(false)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t('rightSidebar.accountType', 'Typ účtu')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('accountType.selectAccountType', 'Zvoľ typ účtu')}
                </p>
              </div>
              
              {/* Account Type Options */}
              <div className="px-6 pb-6 space-y-3">
                    <button 
                      onClick={() => {
                        setIsMobileModalOpen(false);
                        setIsPersonalAccountModalOpen(true);
                      }} 
                      className={`w-full py-4 px-6 rounded-lg transition-colors ${
                        accountType === 'personal' 
                          ? 'border-2 border-black dark:border-white' 
                          : 'border-2 border-gray-300 dark:border-gray-700'
                      }`}
                    >
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
                <button 
                  onClick={() => {
                    setIsMobileModalOpen(false);
                    setIsAccountTypeModalOpen(true);
                  }} 
                  className={`w-full py-4 px-6 rounded-lg transition-colors ${
                    accountType === 'business' 
                      ? 'border-2 border-black dark:border-white' 
                      : 'border-2 border-gray-300 dark:border-gray-700'
                  }`}
                >
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
        </div>
          )}

        </div>
      );
    }
