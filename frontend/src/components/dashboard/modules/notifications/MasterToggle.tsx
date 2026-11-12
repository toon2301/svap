'use client';

import React from 'react';

import { useDelayedLoading } from '@/hooks/useDelayedLoading';

interface MasterToggleProps {
  /** Poloha vypínača; `null` = hodnota nie je známa (nenačítala sa zo servera): bez bežca a zakázaný. */
  enabled: boolean | null;
  onChange: (v: boolean) => void;
  label: string;
  compact?: boolean; // mobile compact
  /** Vypínač sa nedá meniť (napr. voľby sa nenačítali zo servera). */
  disabled?: boolean;
  /** Hodnota sa ešte načítava zo servera: namiesto polohy bežca je kostra (nález 286, 321). */
  loading?: boolean;
  /** `data-testid` tlačidla vypínača. */
  testId?: string;
}

/**
 * Hlavný vypínač „Vypnúť všetko“. Kým sa hodnota načítava (`loading`), nemá polohu, lebo nepravdivé „vypnuté“ by sa po
 * načítaní prehodilo: je zakázaný, označený `aria-busy` a prvých 200 ms neviditeľný (drží miesto), potom pulzuje ako
 * ostatné kostry Nastavení. S `enabled` `null` (po zlyhaní načítania) je poloha neznáma: vypínač je zakázaný, sivý a
 * bez bežca, ale nie zaneprázdnený, lebo predvolená poloha nie je stav servera (PR 258). `disabled` ho len zakáže
 * (stlmený, kliknutie nič nezmení).
 */
export default function MasterToggle({ enabled, onChange, label, compact, disabled, loading, testId }: MasterToggleProps) {
  const showSkeleton = useDelayedLoading(Boolean(loading));
  const unknown = enabled === null;
  let stateClass = enabled ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600';
  if (loading) {
    stateClass = showSkeleton ? 'bg-gray-200 dark:bg-gray-700 animate-pulse' : 'invisible';
  } else if (unknown) {
    stateClass = 'bg-gray-200 dark:bg-gray-700';
  }

  return (
    <div className={`flex items-center ${compact ? 'justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800' : 'justify-between'}`}>
      <span className={compact ? 'text-sm font-medium text-gray-900 dark:text-white' : 'text-sm font-medium text-gray-900 dark:text-white'}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        disabled={disabled || loading || unknown}
        aria-busy={loading ? true : undefined}
        data-testid={testId}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed ${
          loading ? '' : 'disabled:opacity-50'
        } ${stateClass}`}
        style={{
          transform: 'scaleY(0.8)',
          transformOrigin: 'left center',
        }}
      >
        {!loading && !unknown && (
          <span
            className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
              enabled ? 'left-6' : 'left-1'
            }`}
          />
        )}
      </button>
    </div>
  );
}


