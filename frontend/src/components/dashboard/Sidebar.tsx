'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  HeartIcon, 
  UserIcon, 
  Cog6ToothIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/ThemeContext';

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
    label: 'Oblúbené',
    icon: HeartIcon,
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
  onClose 
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const handleItemClick = (itemId: string) => {
    onItemClick(itemId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const sidebarContent = (
    <div className={`flex flex-col ${isMobile ? 'h-dvh' : 'h-screen'} bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800`}>
      {/* Logo */}
      <div className="flex items-center justify-center py-1 border-b border-gray-200 dark:border-gray-800">
        <img 
          src="/Logotyp _svaply_ na fialovom pozadí.png" 
          alt="Swaply" 
          className="h-24 w-auto"
        />
        {isMobile && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {sidebarItems.map((item) => {
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
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Theme Toggle + Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
          aria-label="Prepínač témy"
        >
          {theme === 'dark' ? (
            <SunIcon className="w-5 h-5 mr-3" />
          ) : (
            <MoonIcon className="w-5 h-5 mr-3" />
          )}
          {theme === 'dark' ? 'Svetlý režim' : 'Tmavý režim'}
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3 text-red-500" />
          Odhlásiť sa
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
            
            {/* Mobile Sidebar */}
            <motion.div
              initial={{ x: -384 }}
              animate={{ x: 0 }}
              exit={{ x: -384 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-dvh w-96 z-50"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="w-96 h-screen">
      {sidebarContent}
    </div>
  );
}
