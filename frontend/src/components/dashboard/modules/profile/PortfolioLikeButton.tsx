'use client';

import type { MouseEvent } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type PortfolioLikeButtonProps = {
  isLiked: boolean;
  likesCount: number;
  label: string;
  onToggle: () => void;
  isPending?: boolean;
  className?: string;
  compact?: boolean;
};

export function PortfolioLikeButton({
  isLiked,
  likesCount,
  label,
  onToggle,
  isPending = false,
  className = '',
  compact = false,
}: PortfolioLikeButtonProps) {
  const { locale } = useLanguage();
  const safeCount = Math.max(0, Number.isFinite(likesCount) ? Math.trunc(likesCount) : 0);
  const formattedCount = new Intl.NumberFormat(locale || 'sk-SK').format(safeCount);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isPending) return;
    onToggle();
  };

  return (
    <button
      type="button"
      aria-label={`${label} (${formattedCount})`}
      aria-pressed={isLiked}
      aria-busy={isPending}
      title={label}
      disabled={isPending}
      onClick={handleClick}
      className={[
        'inline-flex items-center justify-center rounded-full border font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-purple-400/60',
        compact ? 'h-8 gap-1.5 px-2 text-xs' : 'h-10 gap-2 px-3 text-sm',
        isLiked
          ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-950/60'
          : 'border-gray-200 bg-white/90 text-gray-700 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 dark:border-gray-800 dark:bg-[#101011]/90 dark:text-gray-200 dark:hover:border-purple-800/70 dark:hover:bg-purple-950/30 dark:hover:text-purple-200',
        isPending ? 'cursor-wait opacity-70' : 'active:scale-95',
        className,
      ].filter(Boolean).join(' ')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={compact ? 'h-4 w-4' : 'h-5 w-5'}
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className="tabular-nums">{formattedCount}</span>
    </button>
  );
}
