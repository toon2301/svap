'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

export type DeleteReviewConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  /** Ak true, zobrazí sa loading stav na tlačidle Vymazať */
  isDeleting?: boolean;
};

export function DeleteReviewConfirmModal({
  open,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteReviewConfirmModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) onClose();
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-review-modal-title"
      aria-describedby="delete-review-modal-desc"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#0f0f10] border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id="delete-review-modal-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t('reviews.deleteReviewTitle', 'Vymazať recenziu?')}
              </h2>
              <p
                id="delete-review-modal-desc"
                className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
              >
                {t('reviews.deleteReviewMessage', 'Naozaj chceš vymazať túto recenziu? Túto akciu nemožno vrátiť späť.')}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-50 transition-colors"
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('common.deleting', 'Vymazávam...')}
                </>
              ) : (
                t('common.delete', 'Vymazať')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
