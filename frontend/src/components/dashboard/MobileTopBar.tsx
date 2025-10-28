'use client';

import { Bars3Icon, UserIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

interface MobileTopBarProps {
  onMenuClick: () => void;
  isEditMode?: boolean;
  onBackClick?: () => void;
  onProfileClick?: () => void;
  activeModule?: string;
  activeRightItem?: string;
}

export default function MobileTopBar({ onMenuClick, isEditMode = false, onBackClick, onProfileClick, activeModule, activeRightItem }: MobileTopBarProps) {
  const { t } = useLanguage();
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="grid grid-cols-3 items-center px-3 py-0 h-12">
        {/* Ľavá strana - Logo alebo šipka späť */}
        <div className="flex items-center h-full justify-start">
          {(isEditMode || activeRightItem === 'language' || activeRightItem === 'account-type' || activeModule === 'notifications' || activeModule === 'account-type') ? (
            <button
              onClick={onBackClick}
              className="p-2 -ml-2"
              aria-label="Späť"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          ) : (
            <img 
              src="/Logotyp _svaply_ na fialovom pozadí.png" 
              alt="Swaply" 
              className="h-12 w-auto"
            />
          )}
        </div>
        
        {/* Stred - Nadpis */}
        <div className="text-center flex items-center justify-center h-full">
          {isEditMode && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">{t('profile.editProfile', 'Upraviť profil')}</h1>
          )}
          {activeRightItem === 'language' && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('language.title', 'Jazyk')}</h1>
          )}
          {activeRightItem === 'account-type' && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Účet</h1>
          )}
          {activeModule === 'notifications' && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('rightSidebar.notifications', 'Upozornenia')}</h1>
          )}
          {activeModule === 'account-type' && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('rightSidebar.accountType', 'Typ účtu')}</h1>
          )}
        </div>
        
        {/* Pravá strana - Profil a Hamburger */}
        <div className="flex items-center justify-end h-full space-x-2">
          {/* Profil ikonka - len keď nie si v profile module ani v upozorneniach ani v account-type */}
          {activeModule !== 'profile' && activeModule !== 'notifications' && activeModule !== 'account-type' && (
            <button
              onClick={onProfileClick}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-purple-600 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
              aria-label={t('rightSidebar.editProfile', 'Profil')}
            >
              <UserIcon className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
          
          {/* Hamburger menu - len v profile module, nie v edit móde ani v jazyk modale ani v account-type ani v upozorneniach */}
          {activeModule === 'profile' && !isEditMode && activeRightItem !== 'language' && activeRightItem !== 'account-type' && (
            <button
              onClick={onMenuClick}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-purple-600 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
              aria-label={t('common.menu', 'Menu')}
            >
              <Bars3Icon className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

