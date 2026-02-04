'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProfileMobileHamburgerModalProps {
  isOpen: boolean;
  mounted: boolean;
  onClose: () => void;
}

export default function ProfileMobileHamburgerModal({
  isOpen,
  mounted,
  onClose,
}: ProfileMobileHamburgerModalProps) {
  const { t } = useLanguage();

  if (!mounted || !isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Overlay s animáciou */}
      <div className="fixed inset-0 z-[70] bg-black/45 animate-fade-in" onClick={onClose} />
      {/* Modal s animáciou */}
      <div
        className="fixed inset-0 z-[71] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in"
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
            <button
              onClick={() => {
                // Nahlásiť - TODO: implementovať funkcionalitu
              }}
              className="w-full text-center px-4 py-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {t('profile.report', 'Nahlásiť')}
            </button>
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
    document.body
  );
}

