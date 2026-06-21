'use client';

import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

type PortfolioImageDeleteConfirmDialogProps = {
  open: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function PortfolioImageDeleteConfirmDialog({
  open,
  isDeleting = false,
  onClose,
  onConfirm,
}: PortfolioImageDeleteConfirmDialogProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        event.preventDefault();
        onClose();
        return;
      }

      // Focus trap: Tab/Shift+Tab cyklí len medzi prvkami v dialógu (neunikne von).
      if (event.key === 'Tab') {
        const container = dialogRef.current;
        if (!container) return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey) {
          if (active === first || !container.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last || !container.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleting, onClose, open]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isDeleting) {
      onClose();
    }
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="portfolio-photo-delete-title"
      aria-describedby="portfolio-photo-delete-description"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-[#0f0f10]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <ExclamationTriangleIcon className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id="portfolio-photo-delete-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t('portfolio.deletePhoto')}
              </h2>
              <p
                id="portfolio-photo-delete-description"
                className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400"
              >
                {t('portfolio.deletePhotoConfirm')}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('common.deleting')}
                </>
              ) : (
                t('portfolio.deletePhoto')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
