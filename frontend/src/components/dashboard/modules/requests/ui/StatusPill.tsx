'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SkillRequestStatus } from '../types';

const STATUS_KEYS: Record<SkillRequestStatus, string> = {
  pending: 'requests.statusPending',
  accepted: 'requests.statusAccepted',
  rejected: 'requests.statusRejected',
  cancelled: 'requests.statusCancelled',
};

const STATUS_CLASS: Record<SkillRequestStatus, string> = {
  pending:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60',
  accepted:
    'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/60',
  rejected:
    'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900/60',
  cancelled:
    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800',
};

export function StatusPill({ status }: { status: SkillRequestStatus }) {
  const { t } = useLanguage();
  const s = status ?? 'pending';
  const label = t(STATUS_KEYS[s]);
  const className = STATUS_CLASS[s] ?? STATUS_CLASS.pending;
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide',
        className,
      ].join(' ')}
    >
      <span className="inline-block size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}


