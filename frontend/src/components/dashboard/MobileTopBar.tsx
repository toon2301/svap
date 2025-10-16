'use client';

import { Bars3Icon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface MobileTopBarProps {
  onMenuClick: () => void;
  isEditMode?: boolean;
  onBackClick?: () => void;
}

export default function MobileTopBar({ onMenuClick, isEditMode = false, onBackClick }: MobileTopBarProps) {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between px-3 py-2">
        {/* Šipka späť vľavo (len ak je edit mode) */}
        {isEditMode ? (
          <button
            onClick={onBackClick}
            className="p-1.5 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-gray-50 transition-all"
            aria-label="Späť"
          >
            <ArrowLeftIcon className="w-5 h-5" strokeWidth={2} />
          </button>
        ) : (
          <div className="w-9"></div>
        )}
        
        {/* Nadpis v strede (len ak je edit mode) */}
        {isEditMode && (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Upraviť profil</h1>
        )}
        
        {/* Hamburger vpravo (vždy) */}
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-purple-600 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
          aria-label="Menu"
        >
          <Bars3Icon className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

