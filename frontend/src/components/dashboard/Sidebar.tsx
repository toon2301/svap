'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  HeartIcon, 
  UserIcon, 
  Cog6ToothIcon,
  InboxIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  LanguageIcon,
  ChevronRightIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/ThemeContext';
import { useRequestsNotifications } from './contexts/RequestsNotificationsContext';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}

interface SidebarProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
  onLogout: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onLanguageClick?: () => void;
  onAccountTypeClick?: () => void;
  onPrivacyClick?: () => void;
  onSearchClick?: () => void;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'home',
    label: 'Nástenka',
    icon: HomeIcon,
  },
  {
    id: 'search',
    label: 'Vyhľadávanie',
    icon: MagnifyingGlassIcon,
  },
  {
    id: 'favorites',
    label: 'Obľúbené',
    icon: HeartIcon,
  },
  {
    id: 'requests',
    label: 'Spolupráce',
    icon: InboxIcon,
  },
  {
    id: 'profile',
    label: 'Profil',
    icon: UserIcon,
  },
  {
    id: 'settings',
    label: 'Nastavenia',
    icon: Cog6ToothIcon,
  },
];

export default function Sidebar({ 
  activeItem, 
  onItemClick, 
  onLogout,
  isMobile = false, 
  isOpen = false, 
  onClose,
  onLanguageClick,
  onAccountTypeClick,
  onPrivacyClick,
  onSearchClick,
}: SidebarProps) {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount, markAllRead } = useRequestsNotifications();
  const handleItemClick = (itemId: string) => {
    // Desktop: pre vyhľadávanie otvor špeciálny search panel namiesto zmeny hlavného modulu
    if (itemId === 'search' && onSearchClick && !isMobile) {
      onSearchClick();
      return;
    }

    // Pre jazyk otvor pravý sidebar namiesto zmeny hlavného modulu
    if (itemId === 'language' && onLanguageClick) {
      onLanguageClick();
      if (isMobile && onClose) {
        onClose();
      }
      return;
    }
    
    // Pre account-type otvor pravý sidebar namiesto zmeny hlavného modulu
    if (itemId === 'account-type' && onAccountTypeClick) {
      onAccountTypeClick();
      if (isMobile && onClose) {
        onClose();
      }
      return;
    }
    
    // Pre privacy otvor pravý sidebar namiesto zmeny hlavného modulu
    if (itemId === 'privacy' && onPrivacyClick) {
      onPrivacyClick();
      if (isMobile && onClose) {
        onClose();
      }
      return;
    }

    // Re-klik na Žiadosti: keď už si v Žiadostiach, označ ako prečítané (badge zmizne)
    if (itemId === 'requests' && activeItem === 'requests') {
      void markAllRead();
    }

    onItemClick(itemId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const sidebarContent = (
    <div className={`flex flex-col ${isMobile ? 'h-dvh pb-16' : 'h-screen'} bg-white dark:bg-black ${isMobile ? '' : 'border-r border-gray-200 dark:border-gray-800'}`}>
      {/* Logo - Desktop only */}
      {!isMobile && (
        <div className="flex items-center justify-center py-1 border-b border-gray-200 dark:border-gray-800">
          <img 
            src="/Logotyp _svaply_ na fialovom pozadí.png" 
            alt="Swaply" 
            className="h-16 w-auto lg:h-16 xl:h-24"
          />
        </div>
      )}

      {/* Mobile header with close button */}
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('rightSidebar.settings', 'Nastavenia')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      )}

      {/* Navigation Items - Desktop only */}
      {!isMobile && (
        <nav className="flex-1 px-3 py-3 space-y-1.5 lg:px-3 lg:py-3 xl:px-4 xl:py-4 xl:space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-2xl transition-all duration-200 lg:px-2 lg:py-2 xl:px-3 xl:py-2.5 ${
                  isActive
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon 
                  className={`w-4 h-4 mr-2 xl:w-5 xl:h-5 xl:mr-3 ${isActive ? 'text-purple-600' : 'text-gray-500 dark:text-gray-400'}`}
                />
                <span className="text-sm">
                  {(() => {
                    if (item.id === 'home') return t('navigation.home', item.label);
                    if (item.id === 'search') return t('navigation.search', item.label);
                    if (item.id === 'favorites') return t('navigation.favorites', item.label);
                    if (item.id === 'requests') return t('navigation.requests', item.label);
                    if (item.id === 'profile') return t('navigation.profile', item.label);
                    if (item.id === 'settings') return t('navigation.settings', item.label);
                    return item.label;
                  })()}
                </span>
                {item.id === 'requests' && unreadCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-purple-600 text-white text-[11px] font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* Prázdny priestor pre mobilnú verziu */}
      {isMobile && (
        <div className="flex-1 px-6 py-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">{t('rightSidebar.appUsage', 'Použitie aplikácie')}</h3>
          
          {/* Upozornenia */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-2 mb-4 border border-purple-100 dark:border-purple-800/30">
            <button
              onClick={() => handleItemClick('notifications')}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center">
                <div className="mr-3 group-hover:scale-110 transition-transform duration-200">
                  <Cog6ToothIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {t('rightSidebar.notifications', 'Upozornenia')}
                  </div>
                </div>
              </div>
              <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-purple-500 group-hover:translate-x-1 transition-all duration-200" />
            </button>
          </div>

          {/* Účet */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-2 mb-4 border border-purple-100 dark:border-purple-800/30">
            <button
              onClick={() => handleItemClick('account-type')}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center">
                <div className="mr-3 group-hover:scale-110 transition-transform duration-200">
                  <UserIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {t('rightSidebar.account', 'Účet')}
                  </div>
                </div>
              </div>
              <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-purple-500 group-hover:translate-x-1 transition-all duration-200" />
            </button>
          </div>

          {/* Súkromie */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-2 mb-4 border border-purple-100 dark:border-purple-800/30">
            <button
              onClick={() => handleItemClick('privacy')}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center">
                <div className="mr-3 group-hover:scale-110 transition-transform duration-200">
                  <LockClosedIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {t('rightSidebar.privacyShort', 'Súkromie')}
                  </div>
                </div>
              </div>
              <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-purple-500 group-hover:translate-x-1 transition-all duration-200" />
            </button>
          </div>
          
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">{t('rightSidebar.appSettings', 'App Settings')}</h3>
          
                 {/* Jazyk a preklady - krajší štýl */}
                 <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-2 mb-4 border border-purple-100 dark:border-purple-800/30">
            <button
              onClick={() => handleItemClick('language')}
              className="w-full flex items-center justify-between group"
            >
                     <div className="flex items-center">
                       <div className="mr-3 group-hover:scale-110 transition-transform duration-200">
                         <LanguageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                       </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {t('rightSidebar.language', 'Jazyk')}
                  </div>
                </div>
              </div>
              <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-purple-500 group-hover:translate-x-1 transition-all duration-200" />
            </button>
          </div>
        </div>
      )}

      {/* Theme Toggle + Logout */}
      <div className={`border-t border-gray-200 dark:border-gray-800 space-y-1.5 ${isMobile ? 'p-6' : 'p-3 lg:p-3 xl:p-4 xl:space-y-2'}`}>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-2xl transition-colors bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 lg:px-2 lg:py-2 xl:px-3 xl:py-2.5"
          aria-label="Prepínač témy"
        >
          {theme === 'dark' ? (
            <SunIcon className="w-4 h-4 mr-2 xl:w-5 xl:h-5 xl:mr-3" />
          ) : (
            <MoonIcon className="w-4 h-4 mr-2 xl:w-5 xl:h-5 xl:mr-3" />
          )}
          <span className="text-sm">
            {theme === 'dark' ? t('common.lightMode', 'Svetlý režim') : t('common.darkMode', 'Tmavý režim')}
          </span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center px-2 py-2 text-sm font-medium text-red-600 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors lg:px-2 lg:py-2 xl:px-3 xl:py-2.5"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2 text-red-500 xl:w-5 xl:h-5 xl:mr-3" />
          <span className="text-sm">{t('navigation.logout', 'Odhlásiť sa')}</span>
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={onClose}
            />
            
            {/* Mobile Sidebar - Full Width */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-dvh w-full z-50"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="h-screen w-full">
      {sidebarContent}
    </div>
  );
}
