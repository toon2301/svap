'use client';

import { Bars3Icon } from '@heroicons/react/24/outline';

interface MobileTopBarProps {
  onMenuClick: () => void;
}

export default function MobileTopBar({ onMenuClick }: MobileTopBarProps) {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-end px-3 py-2">
        {/* Hamburger vpravo */}
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-gray-50 transition-all"
          aria-label="Menu"
        >
          <Bars3Icon className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

