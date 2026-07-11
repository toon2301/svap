'use client';

import type { MouseEvent } from 'react';
import { HandThumbUpIcon as HandThumbUpOutlineIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as HandThumbUpSolidIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '@/contexts/LanguageContext';

type ProfileLikeButtonProps = {
  isLiked: boolean;
  likesCount: number;
  label: string;
  staticLabel?: string;
  onToggle?: () => void;
  isPending?: boolean;
  className?: string;
  compact?: boolean;
  showText?: boolean;
  icon?: 'heart' | 'thumb';
  tone?: 'rose' | 'purple';
  unstyled?: boolean;
};

export function ProfileLikeButton({
  isLiked,
  likesCount,
  label,
  staticLabel,
  onToggle,
  isPending = false,
  className = '',
  compact = false,
  showText = false,
  icon = 'heart',
  tone = 'rose',
  unstyled = false,
}: ProfileLikeButtonProps) {
  const { locale } = useLanguage();
  const safeCount = Math.max(0, Number.isFinite(likesCount) ? Math.trunc(likesCount) : 0);
  const formattedCount = new Intl.NumberFormat(locale || 'sk-SK').format(safeCount);
  const isInteractive = typeof onToggle === 'function';
  const visibleText = isInteractive ? label : staticLabel || label;
  const accessibleLabel = `${visibleText} (${formattedCount})`;

  const activeToneClasses =
    tone === 'purple'
      ? 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-200'
      : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200';
  const interactiveToneClasses =
    tone === 'purple'
      ? 'hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 focus:ring-purple-300/70 dark:hover:border-purple-900/60 dark:hover:bg-purple-950/30 dark:hover:text-purple-200'
      : 'hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:ring-rose-300/70 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/30 dark:hover:text-rose-200';

  const classes = [
    'inline-flex min-w-0 items-center justify-center font-semibold transition',
    unstyled ? '' : 'rounded-full border shadow-sm',
    compact ? 'h-8 gap-1.5 px-2.5 text-xs' : 'h-10 gap-2 px-3.5 text-sm',
    unstyled
      ? isLiked
        ? tone === 'purple'
          ? 'text-purple-700 dark:text-purple-200'
          : 'text-rose-700 dark:text-rose-200'
        : 'text-gray-500 dark:text-gray-400'
      : isLiked
        ? activeToneClasses
        : 'border-gray-200 bg-white/90 text-gray-700 dark:border-gray-800 dark:bg-[#101011]/90 dark:text-gray-200',
    isInteractive
      ? `focus:outline-none focus:ring-2 active:scale-95 ${unstyled ? '' : interactiveToneClasses}`
      : 'cursor-default',
    isPending ? 'cursor-wait opacity-70' : '',
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {icon === 'thumb' ? (
        isLiked ? (
          <HandThumbUpSolidIcon
            className={compact ? 'h-4 w-4' : 'h-5 w-5'}
            aria-hidden="true"
          />
        ) : (
          <HandThumbUpOutlineIcon
            className={compact ? 'h-4 w-4' : 'h-5 w-5'}
            aria-hidden="true"
          />
        )
      ) : (
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
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
        </svg>
      )}
      {showText && <span className="min-w-0 truncate">{visibleText}</span>}
      {showText && <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-40" aria-hidden="true" />}
      <span className="shrink-0 tabular-nums">{formattedCount}</span>
    </>
  );

  if (!isInteractive) {
    return (
      <span className={classes} aria-label={accessibleLabel} title={staticLabel || label}>
        {content}
      </span>
    );
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isPending) return;
    onToggle();
  };

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      aria-pressed={isLiked}
      aria-busy={isPending}
      title={label}
      disabled={isPending}
      onClick={handleClick}
      className={classes}
    >
      {content}
    </button>
  );
}
