'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

type DeleteMessageConfirmModalProps = {
  open: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteMessageConfirmModal({
  open,
  isDeleting = false,
  onClose,
  onConfirm,
}: DeleteMessageConfirmModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted || typeof document === 'undefined') {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-message-modal-title"
      aria-describedby="delete-message-modal-desc"
      onClick={handleBackdropClick}
      data-testid="delete-message-confirm-modal"
    >
      <div
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
                id="delete-message-modal-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t('messages.deleteConfirmTitle', 'Vymazať správu?')}
              </h2>
              <p
                id="delete-message-modal-desc"
                className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400"
              >
                {t(
                  'messages.deleteConfirmDescription',
                  'Týmto sa správa vymaže pre všetkých účastníkov. Je však možné, že si ju už niektorí stihli prečítať. Správy, ktoré boli odvolané, sa môžu stále zobraziť v prípade nahlásenia konverzácie.',
                )}
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
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('common.deleting', 'Vymazávam...')}
                </>
              ) : (
                t('messages.deleteAction', 'Vymazať')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
