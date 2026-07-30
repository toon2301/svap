'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronUpIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';

import UtilityMenuActions from './UtilityMenuActions';

type DesktopUtilityMenuProps = {
  onLogout: () => void;
};

export default function DesktopUtilityMenu({ onLogout }: DesktopUtilityMenuProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    firstItemRef.current?.focus();

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="relative border-t border-gray-200 p-3 dark:border-gray-800 xl:p-4"
    >
      {isOpen && (
        <div
          id="desktop-utility-menu"
          role="menu"
          aria-label={t('navigation.more', 'Viac')}
          className="absolute bottom-full left-3 right-3 z-30 mb-2 space-y-1 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-800 dark:bg-gray-950 xl:left-4 xl:right-4"
        >
          <UtilityMenuActions
            firstItemRef={firstItemRef}
            onActionComplete={() => setIsOpen(false)}
            onLogout={onLogout}
          />
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="desktop-utility-menu"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex w-full items-center rounded-2xl px-2 py-2 text-sm font-medium transition-colors xl:px-3 xl:py-2.5 ${
          isOpen
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
      >
        <EllipsisHorizontalIcon className="mr-2 h-5 w-5 xl:mr-3" aria-hidden="true" />
        <span>{t('navigation.more', 'Viac')}</span>
        <ChevronUpIcon
          className={`ml-auto h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
