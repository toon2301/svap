'use client';

import DelayedSkeleton from '../settings/DelayedSkeleton';
import { optionRowPadding } from './OptionRow';

type OptionRowsSkeletonProps = {
  /** Text pre čítače obrazovky („Načítavam nastavenia…“). */
  label: string;
  /** Hustejšie rozloženie (desktop), rovnaké ako `dense` pri `OptionRow`. */
  dense?: boolean;
  /** `data-testid` obalu (predvolene `option-rows-skeleton`). */
  testId?: string;
};

/**
 * Kostra dvojice riadkov „Vypnuté / Zapnuté“ (nález 286). Kým sa nenačíta uložená voľba, riadky sa nevykreslia, lebo by
 * ukazovali nepravdivé „Vypnuté“ a po príchode údajov by sa výber prehodil. Kostra preberá odsadenie riadku
 * (`optionRowPadding`), kruh 20 px a medzeru medzi riadkami z `Section` a mobilného rozloženia, takže má rovnakú výšku
 * ako skutočné riadky a nič sa neposunie. Ukáže sa až po 200 ms (`DelayedSkeleton`), rýchla odpoveď ju neukáže vôbec.
 */
export default function OptionRowsSkeleton({
  label,
  dense = false,
  testId = 'option-rows-skeleton',
}: OptionRowsSkeletonProps) {
  const row = (
    <div className={`flex items-center ${optionRowPadding(dense)}`} data-testid={`${testId}-row`}>
      <div className="mr-3 h-5 w-5 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );

  return (
    <DelayedSkeleton isLoading label={label} testId={testId}>
      <div className="space-y-0">
        {row}
        <div className={dense ? '' : '-mt-1'} data-testid={`${testId}-gap`} />
        {row}
      </div>
    </DelayedSkeleton>
  );
}
