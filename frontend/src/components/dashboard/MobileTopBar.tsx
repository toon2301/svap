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
  accountName?: string;
  messagePeerName?: string;
  messagePeerAvatarUrl?: string | null;
  isMessageConversationOpen?: boolean;
  onMessagesBackClick?: () => void;
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
  accountName,
  messagePeerName,
  messagePeerAvatarUrl,
  isMessageConversationOpen = false,
  onMessagesBackClick,
}: MobileTopBarProps) {
  const { t } = useLanguage();
  const [describeMode, setDescribeMode] = React.useState<'offer' | 'search' | null>(null);
  const isOpenMessagesConversation = activeModule === 'messages' && isMessageConversationOpen;

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
      <div
        className={`grid items-center px-3 py-0 h-12 ${
          activeModule === 'messages' ? 'grid-cols-[2.5rem_1fr_2.5rem]' : 'grid-cols-3'
        }`}
      >
        {/* Ľavá strana - Žiadosti (nadpis) alebo Šipka späť alebo prázdne */}
        <div className="flex items-center h-full justify-start">
          {activeModule === 'messages' && isMessageConversationOpen ? (
            <button
              type="button"
              onClick={onMessagesBackClick}
              className="p-2 -ml-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#161618] transition-colors"
              aria-label={t('common.back', 'Späť')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          ) : activeModule === 'messages' && !isMessageConversationOpen ? null : activeModule === 'requests' ? (
            <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {t('requests.title', 'Spolupráce')}
            </h1>
          ) : (isEditMode || activeRightItem === 'language' || activeRightItem === 'account-type' || activeRightItem === 'privacy' || activeModule === 'notifications' || activeModule === 'account-type' || activeModule === 'privacy' || activeModule === 'skills' || activeModule === 'skills-offer' || activeModule === 'skills-search' || activeModule === 'skills-select-category' || activeModule === 'user-profile' || activeModule === 'offer-reviews') ? (
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
        
        {/* Stred - Nadpis (pre requests je nadpis vľavo) */}
        <div className="flex h-full min-w-0 items-center justify-center text-center">
          {activeModule === 'messages' && !isMessageConversationOpen ? (
            <h1 className="w-full min-w-0 truncate px-1 text-center text-xl font-semibold leading-tight text-gray-900 dark:text-white">
              {accountName || t('navigation.profile', 'Profil')}
            </h1>
          ) : null}
          {activeModule === 'messages' && isMessageConversationOpen ? (
            <div className="flex w-full min-w-0 items-center justify-center px-1">
              <div className="flex min-w-0 max-w-[min(100%,calc(100vw-5.5rem))] items-center justify-center gap-2">
                <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/40">
                  {messagePeerAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={messagePeerAvatarUrl}
                      alt={messagePeerName || t('messages.unknownUser', 'Používateľ')}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300">
                      {(messagePeerName || 'U').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <h1 className="min-w-0 truncate text-center text-lg font-semibold leading-tight text-gray-900 dark:text-white">
                  {messagePeerName || t('messages.unknownUser', 'Používateľ')}
                </h1>
              </div>
            </div>
          ) : null}
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
          {activeModule === 'offer-reviews' && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('reviews.title', 'Recenzie')}</h1>
          )}
        </div>
        
        {/* Pravá strana - Obnoviť (žiadosti), Profil, Hamburger alebo Krížik */}
        <div
          className={`flex items-center justify-end h-full space-x-2 ${
            activeModule === 'messages' && isMessageConversationOpen ? 'opacity-0 pointer-events-none' : ''
          }`}
          aria-hidden={activeModule === 'messages' && isMessageConversationOpen ? true : undefined}
        >
          {/* Obnoviť pre modul Žiadosti */}
          {activeModule === 'requests' && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('requestsRefresh'));
                }
              }}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
            >
              {t('common.refresh', 'Obnoviť')}
            </button>
          )}
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

          {/* Ikona profilu – rýchly prechod na profil (skrytá v upozorneniach, účte a súkromí) */}
          {onProfileClick && activeModule !== 'profile' && activeModule !== 'user-profile' && activeModule !== 'skills-describe' && activeModule !== 'requests' && activeModule !== 'messages' && activeModule !== 'offer-reviews' && activeModule !== 'notifications' && activeModule !== 'account-type' && activeRightItem !== 'account-type' && activeModule !== 'privacy' && activeRightItem !== 'privacy' && (
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