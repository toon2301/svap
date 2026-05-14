'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SkillRequest } from '../types';
import { getTerminationReasonLabel } from '../terminationReasons';

type Props = {
  status?: SkillRequest['status'] | null;
  termination?: SkillRequest['termination'] | null;
  id?: string;
  className?: string;
  compact?: boolean;
};

export function TerminationReasonNotice({
  status,
  termination,
  id,
  className = '',
  compact = false,
}: Props) {
  const { t } = useLanguage();
  const reasonLabel = getTerminationReasonLabel(termination?.reason, t);

  if (status !== 'terminated' || !termination || !reasonLabel) return null;

  const wrapperClass = [
    'rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200',
    compact ? 'px-2.5 py-2 text-[11px] leading-snug' : 'px-3 py-2.5 text-xs leading-relaxed',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const labelClass = 'font-semibold text-slate-900 dark:text-slate-100';

  return (
    <div id={id} className={wrapperClass}>
      <p>
        <span className={labelClass}>{t('requests.terminationReasonLabel')}:</span>{' '}
        <span>{reasonLabel}</span>
      </p>
    </div>
  );
}
