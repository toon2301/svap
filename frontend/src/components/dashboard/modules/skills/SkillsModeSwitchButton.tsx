'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SkillsModeSwitchButtonProps {
  targetMode: 'offer' | 'search';
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

export default function SkillsModeSwitchButton({
  targetMode,
  onClick,
  className = '',
  compact = false,
}: SkillsModeSwitchButtonProps) {
  const { t } = useLanguage();
  const label =
    targetMode === 'search'
      ? t('skills.search', 'Hľadám')
      : t('skills.offer', 'Ponúkam');

  if (!onClick) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        'inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white font-semibold text-gray-900 shadow-sm transition-all',
        'hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60',
        'active:scale-[0.98]',
        'dark:border-gray-700 dark:bg-black dark:text-gray-100 dark:hover:border-purple-500/70 dark:hover:bg-purple-900/20 dark:hover:text-purple-200',
        compact ? 'px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm' : 'px-4 py-2 text-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </button>
  );
}
