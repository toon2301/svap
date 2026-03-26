'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export function CreateRequestCta({
  disabled = false,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-[#0f0f10] px-3 py-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100 hover:bg-white/80 dark:hover:bg-[#141416] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {t('requests.createFromChat', 'Vytvoriť žiadosť')}
    </button>
  );
}

