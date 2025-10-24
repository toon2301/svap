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
      <div className="flex items-center justify-between px-3 py-0 h-12">
        {/* Logo vľavo alebo šipka späť v edit móde alebo jazyk alebo upozornenia */}
        {(isEditMode || activeRightItem === 'language' || activeModule === 'notifications') ? (
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
          <div className="flex items-center">
            <img 
              src="/Logotyp _svaply_ na fialovom pozadí.png" 
              alt="Swaply" 
              className="h-16 w-auto"
            />
          </div>
        )}
        
        {/* Nadpis v strede (len ak je edit mode alebo jazyk alebo upozornenia) */}
        {isEditMode && (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.editProfile', 'Upraviť profil')}</h1>
        )}
        {activeRightItem === 'language' && (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white absolute left-1/2 transform -translate-x-1/2">{t('language.title', 'Jazyk')}</h1>
        )}
        {activeModule === 'notifications' && (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white absolute left-1/2 transform -translate-x-1/2">{t('rightSidebar.notifications', 'Upozornenia')}</h1>
        )}
        
        {/* Pravá strana - Profil a Hamburger */}
        <div className="flex items-center space-x-2">
          {/* Profil ikonka - len keď nie si v profile module ani v upozorneniach */}
          {activeModule !== 'profile' && activeModule !== 'notifications' && (
            <button
              onClick={onProfileClick}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-purple-600 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
              aria-label={t('rightSidebar.editProfile', 'Profil')}
            >
              <UserIcon className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
          
        {/* Hamburger menu - len v profile module, nie v edit móde ani v jazyk modale ani v upozorneniach */}
        {activeModule === 'profile' && !isEditMode && activeRightItem !== 'language' && activeModule !== 'notifications' && (
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

