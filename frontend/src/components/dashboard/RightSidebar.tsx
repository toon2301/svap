'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserIcon,
  BellIcon,
  NoSymbolIcon,
  LanguageIcon,
  UserGroupIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface RightSidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem: string;
  onItemClick: (itemId: string) => void;
  isMobile?: boolean;
}

const rightSidebarItems: RightSidebarItem[] = [
  {
    id: 'edit-profile',
    label: 'Upraviť profil',
    icon: UserIcon,
  },
  {
    id: 'notifications',
    label: 'Upozornenia',
    icon: BellIcon,
  },
  {
    id: 'blocked',
    label: 'Blokované',
    icon: NoSymbolIcon,
  },
  {
    id: 'language',
    label: 'Jazyk',
    icon: LanguageIcon,
  },
  {
    id: 'account-type',
    label: 'Typ účtu',
    icon: UserGroupIcon,
  },
];

export default function RightSidebar({ 
  isOpen, 
  onClose, 
  activeItem, 
  onItemClick,
  isMobile = false 
}: RightSidebarProps) {
  const { t } = useLanguage();
  const handleItemClick = (itemId: string) => {
    onItemClick(itemId);
    if (isMobile) {
      onClose();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-black border-l border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('rightSidebar.settings', 'Nastavenia')}</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          aria-label={t('rightSidebar.close', 'Zatvoriť')}
        >
          <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {rightSidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-purple-600' : 'text-gray-500 dark:text-gray-400'}`} />
              {(() => {
                if (item.id === 'edit-profile') return t('rightSidebar.editProfile', item.label);
                if (item.id === 'notifications') return t('rightSidebar.notifications', item.label);
                if (item.id === 'blocked') return t('rightSidebar.blocked', item.label);
                if (item.id === 'language') return t('rightSidebar.language', item.label);
                if (item.id === 'account-type') return t('rightSidebar.accountType', item.label);
                return item.label;
              })()}
            </button>
          );
        })}
      </nav>
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
            
            {/* Mobile Right Sidebar */}
            <motion.div
              initial={{ x: 384 }}
              animate={{ x: 0 }}
              exit={{ x: 384 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-96 z-50"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />
          
          {/* Right Sidebar */}
          <motion.div
            initial={{ x: 384 }}
            animate={{ x: 0 }}
            exit={{ x: 384 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-96 h-full relative z-50"
          >
            {sidebarContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
