'use client';

/**
 * Potvrdenie nezvratnej akcie vo feede (zmazanie komentára, odstránenie
 * vlastného označenia).
 *
 * Vizuálne aj štruktúrne kópia `DeleteMessageConfirmModal` z messages (červený
 * varovný kruh, `role="alertdialog"`, Zrušiť/Vymazať) – nahrádza natívny
 * `window.confirm`, ktorý vyzeral cudzo oproti zvyšku appky.
 *
 * Texty aj testId majú predvolené hodnoty pre komentáre, aby volajúci, ktorý
 * ich nepotrebuje meniť, ostal bez zmeny.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeedDialog } from './useFeedDialog';

type FeedDestructiveConfirmProps = {
  open: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  hint?: string;
  confirmLabel?: string;
  busyLabel?: string;
  testId?: string;
};

export default function FeedDestructiveConfirm({
  open,
  isDeleting = false,
  onClose,
  onConfirm,
  title,
  hint,
  confirmLabel,
  busyLabel,
  testId = 'feed-comment-delete-confirm',
}: FeedDestructiveConfirmProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Escape + fokus dovnútra + Tab trap + návrat fokusu na spúšťač – rovnaký
  // hook ako feedové dialógy, nie vlastná kópia.
  const dialogRef = useFeedDialog({ open, onClose, canClose: !isDeleting });

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="feed-comment-delete-title"
      data-testid={testId}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
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
                id="feed-comment-delete-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {title ??
                  t('feed.commentDeleteConfirm', 'Naozaj chcete odstrániť tento komentár?')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {hint ?? t('feed.commentDeleteHint', 'Túto akciu už nie je možné vrátiť späť.')}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50"
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
            <button
              type="button"
              onClick={() => void onConfirm()}
              disabled={isDeleting}
              data-testid={`${testId}-action`}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {busyLabel ?? t('common.deleting', 'Vymazávam...')}
                </>
              ) : (
                (confirmLabel ?? t('messages.deleteAction', 'Vymazať'))
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
