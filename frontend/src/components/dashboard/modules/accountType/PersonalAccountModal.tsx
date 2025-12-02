'use client';
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function PersonalAccountModal({ isOpen, onClose, onConfirm }: Props) {
  const { t } = useLanguage();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm md:max-w-md lg:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {t('accountType.modalTitle', 'Prajete si prepnúť účet?')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t(
                'accountType.personalDescription',
                'Osobný účet je určený pre bežných používateľov, ktorí nepodnikajú. Prepnutím z firemného účtu prídete o jeho rozšírené možnosti.'
              )}
            </p>
          </div>
          {/* Buttons */}
          <div className="px-6 space-y-3 pb-6">
            <button
              onClick={onConfirm}
              className="w-full py-3 text-base rounded-lg bg-[var(--muted)] text-purple-600 dark:text-purple-400 hover:bg-gray-200 dark:hover:bg-[#141414] font-semibold"
            >
              {t('accountType.change', 'Zmeniť')}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 text-base rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
            >
              {t('accountType.cancel', 'Zrušiť')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

