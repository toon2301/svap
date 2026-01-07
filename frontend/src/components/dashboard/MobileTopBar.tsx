'use client';

import React from 'react';
import { Bars3Icon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

interface MobileTopBarProps {
  onMenuClick: () => void;
  isEditMode?: boolean;
  onBackClick?: () => void;
  onProfileClick?: () => void;
  activeModule?: string;
  activeRightItem?: string;
  subcategory?: string | null;
  onSaveClick?: () => void;
}

export default function MobileTopBar({
  onMenuClick,
  isEditMode = false,
  onBackClick,
  onProfileClick,
  activeModule,
  activeRightItem,
  subcategory,
  onSaveClick,
}: MobileTopBarProps) {
  const { t } = useLanguage();
  const [describeMode, setDescribeMode] = React.useState<'offer' | 'search' | null>(null);

  React.useEffect(() => {
    if (activeModule === 'skills-describe') {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('skillsDescribeMode');
        if (stored === 'search' || stored === 'offer') {
          setDescribeMode(stored);
        } else {
          setDescribeMode(null);
        }
      } else {
        setDescribeMode(null);
      }
    }
  }, [activeModule]);

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="grid grid-cols-3 items-center px-3 py-0 h-12">
        {/* Ľavá strana - Šipka späť alebo prázdne */}
        <div className="flex items-center h-full justify-start">
          {(isEditMode || activeRightItem === 'language' || activeRightItem === 'account-type' || activeRightItem === 'privacy' || activeModule === 'notifications' || activeModule === 'account-type' || activeModule === 'privacy' || activeModule === 'skills' || activeModule === 'skills-offer' || activeModule === 'skills-search' || activeModule === 'skills-select-category' || activeModule === 'user-profile') ? (
            <button
              onClick={onBackClick}
              className="p-2 -ml-2"
              aria-label="Späť"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          ) : activeModule === 'skills-describe' ? (
            <button
              onClick={onSaveClick}
              className="p-2 -ml-2"
              aria-label="Uložiť"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          ) : null}
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
          {(activeRightItem === 'privacy' || activeModule === 'privacy') && (
            <h1 className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">{t('privacy.mobileTitle', 'Súkromie účtu')}</h1>
          )}
          {activeModule === 'notifications' && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('rightSidebar.notifications', 'Upozornenia')}</h1>
          )}
          {activeModule === 'account-type' && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('rightSidebar.accountType', 'Typ účtu')}</h1>
          )}
          {activeModule === 'skills' && (
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{t('profile.skills', 'Zručnosti a služby')}</h1>
          )}
          {activeModule === 'skills-offer' && (
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{t('skills.offer', 'Ponúkam')}</h1>
          )}
          {activeModule === 'skills-search' && (
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{t('skills.search', 'Hľadám')}</h1>
          )}
          {activeModule === 'skills-select-category' && (
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{t('skills.selectCategoryTitle', 'Vyber kategóriu')}</h1>
          )}
          {activeModule === 'skills-describe' && (
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white max-lg:whitespace-normal lg:whitespace-nowrap max-lg:leading-tight">
              {describeMode === 'search'
                ? t('skills.describeWhatYouSeek', 'Opíš čo presne hľadáš')
                : t('skills.describeSkillTitle', 'Opíš svoju službu/zručnosť')}
            </h1>
          )}
        </div>
        
        {/* Pravá strana - Profil, Hamburger alebo Krížik */}
        <div className="flex items-center justify-end h-full space-x-2">
          {/* Krížik pre skills-describe */}
          {activeModule === 'skills-describe' && (
            <button
              onClick={onBackClick}
              className="p-2 -mr-2"
              aria-label="Zatvoriť"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Ikona profilu – rýchly prechod na profil (ak nie sme na profile ani na cudzom profile) */}
          {onProfileClick && activeModule !== 'profile' && activeModule !== 'user-profile' && activeModule !== 'skills-describe' && (
            <button
              onClick={onProfileClick}
              className="p-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-black text-gray-600 dark:text-gray-300 shadow-sm hover:border-purple-400 hover:text-purple-600 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
              aria-label={t('navigation.profile', 'Profil')}
            >
              <UserCircleIcon className="w-5 h-5" />
            </button>
          )}

          {/* Hamburger menu - v profile module alebo na cudzom profile (user-profile), nie v edit móde ani v jazyk/account-type/prípadne privacy modale */}
          {(activeModule === 'profile' || activeModule === 'user-profile') &&
            !isEditMode &&
            activeRightItem !== 'language' &&
            activeRightItem !== 'account-type' &&
            activeRightItem !== 'privacy' && (
              <button
                onClick={() => {
                  if (activeModule === 'user-profile') {
                    // Na cudzom profile otvor modal cez window event
                    if (typeof (window as any).__openUserProfileModal === 'function') {
                      (window as any).__openUserProfileModal();
                    }
                  } else {
                    // Na vlastnom profile otvor normálne menu
                    onMenuClick();
                  }
                }}
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