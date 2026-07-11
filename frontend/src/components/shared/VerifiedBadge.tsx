'use client';

import React from 'react';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '@/contexts/LanguageContext';

type VerifiedBadgeSize = 'sm' | 'md' | 'lg';

interface VerifiedBadgeProps {
  /** sm = list avatars, md/lg = profile avatars. */
  size?: VerifiedBadgeSize;
  /** Additional positioning classes; parent must be `relative`. */
  className?: string;
}

const sizeClasses: Record<VerifiedBadgeSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-7 w-7',
};

/**
 * Verification badge for verified accounts.
 * Render only when user.is_verified === true; parent must be `relative`.
 */
export default function VerifiedBadge({ size = 'md', className = '' }: VerifiedBadgeProps) {
  const { t } = useLanguage();
  const label = t('common.verifiedAccount', 'Verified account');

  return (
    <span
      className={`absolute right-0 top-0 z-20 inline-flex translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-white p-[1px] shadow-sm ring-1 ring-white/90 dark:bg-black dark:ring-black/90 ${className}`}
      title={label}
      aria-label={label}
      role="img"
      data-testid="verified-badge"
    >
      <CheckBadgeIcon
        aria-hidden="true"
        className={`${sizeClasses[size]} text-[#7C3AED]`}
      />
    </span>
  );
}
