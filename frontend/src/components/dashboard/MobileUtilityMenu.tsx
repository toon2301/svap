'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronUpIcon,
  EllipsisHorizontalIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';

import UtilityMenuActions from './UtilityMenuActions';

type MobileUtilityMenuProps = {
  onBugReportOpen?: () => void;
  onLogout: () => void;
};

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
const SWIPE_CLOSE_THRESHOLD = 60;

export default function MobileUtilityMenu({ onBugReportOpen, onLogout }: MobileUtilityMenuProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = 'hidden';
    firstItemRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const sheet = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/55"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-utility-menu-title"
            onTouchStart={(event) => {
              touchStartYRef.current = event.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(event) => {
              const startY = touchStartYRef.current;
              const endY = event.changedTouches[0]?.clientY;
              touchStartYRef.current = null;
              if (startY !== null && endY !== undefined && endY - startY > SWIPE_CLOSE_THRESHOLD) {
                close();
              }
            }}
            className="w-full rounded-t-3xl border border-b-0 border-gray-200 bg-white px-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-2 text-gray-900 shadow-2xl dark:border-gray-800 dark:bg-gray-950 dark:text-white"
          >
            <div className="mx-auto h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-700" aria-hidden="true" />
            <div className="flex items-center justify-between py-3">
              <h2 id="mobile-utility-menu-title" className="text-lg font-bold">
                {t('navigation.more', 'Viac')}
              </h2>
              <button
                type="button"
                onClick={close}
                className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
                aria-label={t('bugReport.close', 'Zatvoriť')}
              >
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div role="group" aria-label={t('navigation.more', 'Viac')} className="space-y-1">
              <UtilityMenuActions
                firstItemRef={firstItemRef}
                onActionComplete={close}
                onBugReportOpen={onBugReportOpen}
                onLogout={onLogout}
              />
            </div>
          </div>
        </div>,
        document.getElementById('app-root') ?? document.body,
      )
    : null;

  return (
    <div className="border-t border-gray-200 p-6 dark:border-gray-800">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center rounded-2xl bg-gray-100 px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <EllipsisHorizontalIcon className="mr-3 h-5 w-5" aria-hidden="true" />
        <span>{t('navigation.more', 'Viac')}</span>
        <ChevronUpIcon className="ml-auto h-4 w-4" aria-hidden="true" />
      </button>
      {sheet}
    </div>
  );
}
