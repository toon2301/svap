'use client';

import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { NoSymbolIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useModalFocusTrap } from './useModalFocusTrap';

type BlockUserConfirmDialogProps = {
  open: boolean;
  isBlocking: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function BlockUserConfirmDialog({
  open,
  isBlocking,
  onClose,
  onConfirm,
}: BlockUserConfirmDialogProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useModalFocusTrap(open, dialogRef);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBlocking) {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBlocking, mounted, onClose, open]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isBlocking) {
      onClose();
    }
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="block-user-title"
      aria-describedby="block-user-description"
      onClick={handleBackdropClick}
      data-testid="block-user-confirm-dialog"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-[#0f0f10]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <NoSymbolIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="block-user-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('profile.blockConfirmTitle', 'Zablokovať používateľa?')}
              </h2>
              <p
                id="block-user-description"
                className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400"
              >
                {t(
                  'profile.blockConfirmDescription',
                  'Navzájom sa prestanete zobrazovať vo vyhľadávaní a na profiloch a nebudete si môcť posielať nové priame správy. História správ a aktívne výmeny zostanú zachované. Používateľ nedostane upozornenie.',
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={onClose}
              disabled={isBlocking}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50"
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isBlocking}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBlocking && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isBlocking
                ? t('profile.blocking', 'Blokujem...')
                : t('profile.block', 'Zablokovať')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
