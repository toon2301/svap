'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  HeartIcon, 
  UserIcon, 
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}

interface SidebarProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
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
  isMobile = false, 
  isOpen = false, 
  onClose 
}: SidebarProps) {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);

  const handleItemClick = (itemId: string) => {
    onItemClick(itemId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const toggleHamburger = () => {
    setIsHamburgerOpen(!isHamburgerOpen);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-purple-800">Swaply</h1>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5 text-gray-600" />
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
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-purple-600' : 'text-gray-500'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Hamburger Menu for Future Features */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={toggleHamburger}
          className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Bars3Icon className="w-5 h-5 mr-3 text-gray-500" />
          Ďalšie funkcie
        </button>
        
        <AnimatePresence>
          {isHamburgerOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-1"
            >
              <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 rounded">
                Prichádzajúce funkcie...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-64 z-50"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="w-64 h-full">
      {sidebarContent}
    </div>
  );
}
