'use client';

import React from 'react';
import OptionRow from './OptionRow';
import OptionRowsSkeleton from './OptionRowsSkeleton';

interface SectionProps {
  title: string;
  description: string;
  value: boolean;
  setValue: (v: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  desktop?: boolean;
  offLabel?: string;
  onLabel?: string;
  /** Kým sa uložená voľba načítava, namiesto riadkov sa ukáže kostra rovnakej výšky (nález 286). */
  loading?: boolean;
  /** Text kostry pre čítače obrazovky. */
  loadingLabel?: string;
}

/**
 * Sekcia Upozornení s nadpisom, popisom, ikonou a dvojicou riadkov „Vypnuté / Zapnuté“. S `loading` namiesto riadkov
 * ukáže kostru rovnakej výšky (nález 286), takže sa po načítaní uloženej voľby nič neposunie. Bez `loading` sa sekcia
 * správa ako doteraz.
 */
export default function Section({ title, description, value, setValue, disabled, icon, desktop, offLabel = 'Vypnuté', onLabel = 'Zapnuté', loading = false, loadingLabel = 'Načítavam...' }: SectionProps) {
  return (
    <div className="rounded-lg bg-[var(--background)] px-6 pt-6 pb-3 min-h-36 shadow-sm">
      <div className="flex items-center justify-between h-full">
        <div className="flex-1">
          <div className="mb-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          </div>
          {loading ? (
            <OptionRowsSkeleton label={loadingLabel} dense={desktop} testId="section-options-skeleton" />
          ) : (
            <div className="space-y-0">
              <OptionRow label={offLabel} selected={!value} disabled={disabled} onSelect={() => setValue(false)} dense={desktop} />
              <div className={desktop ? '' : '-mt-1'} />
              <OptionRow label={onLabel} selected={value} disabled={disabled} onSelect={() => setValue(true)} dense={desktop} />
            </div>
          )}
        </div>
        {icon}
      </div>
    </div>
  );
}


