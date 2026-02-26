'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  open: boolean;
  onClose: () => void;
  onReportClick?: () => void;
  isReported?: boolean;
};

export function ProfileDesktopHamburgerModal({ open, onClose, onReportClick, isReported }: Props) {
  const { t } = useLanguage();

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[70] bg-black/45" onClick={onClose} />
      {/* Modal */}
      <div className="fixed inset-0 z-[71] flex items-center justify-center px-4" onClick={onClose}>
        <div
          className="w-full max-w-sm rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 space-y-2">
            <button
              onClick={() => {
                // Zablokovať - TODO: implementovať funkcionalitu
              }}
              className="w-full text-center px-4 py-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {t('profile.block', 'Zablokovať')}
            </button>
            {onReportClick && (
              isReported ? (
                <div className="w-full text-center px-4 py-3 text-gray-500 dark:text-gray-400 rounded-lg bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed">
                  {t('profile.reported', 'Nahlásené')}
                </div>
              ) : (
                <button
                  onClick={() => {
                    onReportClick();
                    onClose();
                  }}
                  className="w-full text-center px-4 py-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t('profile.report', 'Nahlásiť profil')}
                </button>
              )
            )}
            <button
              onClick={() => {
                // Zdieľať - TODO: implementovať funkcionalitu
              }}
              className="w-full text-center px-4 py-3 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {t('profile.share', 'Zdieľať')}
            </button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            <button
              onClick={onClose}
              className="w-full text-center px-4 py-3 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

