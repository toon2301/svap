'use client';

import { useId } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { diagnosticCountry } from './searchDiagnostics';
import type { SearchDiagnostics } from './useSearchDiagnostics';

interface SearchDiagnosticsPanelProps {
  diagnostics: SearchDiagnostics;
  country: string | null;
  showSkills: boolean;
  showUsers: boolean;
}

/** Expose local, opt-in evidence inside the PWA without exporting data or changing search. */
export function SearchDiagnosticsPanel({ diagnostics, country, showSkills, showUsers }: SearchDiagnosticsPanelProps) {
  const { t } = useLanguage();
  const regionId = useId();
  const { enabled, snapshot, setEnabled } = diagnostics;
  const label = (key: string) => t(`searchDiagnostics.${key}`);
  const yesNo = (value: boolean) => label(value ? 'yes' : 'no');
  const unset = label('unset');
  const rows: [string, string | number][] = [
    ['currentCountry', diagnosticCountry(country) ?? unset],
    ['showSkills', yesNo(showSkills)],
    ['showUsers', yesNo(showUsers)],
  ];
  if (snapshot) {
    rows.push(
      ['filterCountry', snapshot.country ?? unset],
      ['sentCountry', snapshot.source === 'network' ? snapshot.country ?? label('notSent') : '—'],
      ['source', label(snapshot.source)],
      ['state', label(snapshot.state)],
      ['httpStatus', snapshot.httpStatus ?? '—'],
      ['offersCount', snapshot.offersCount ?? '—'],
      ['usersCount', snapshot.usersCount ?? '—'],
      ['queryLength', snapshot.queryLength],
      ['offerType', label(snapshot.offerType)],
      ['onlyMyLocation', yesNo(snapshot.onlyMyLocation)],
      ['priceMinSet', yesNo(snapshot.priceMinSet)],
      ['priceMaxSet', yesNo(snapshot.priceMaxSet)],
      ['validCollections', snapshot.validCollections === null ? '—' : yesNo(snapshot.validCollections)],
      ['manualCountrySnapshot', snapshot.manualCountrySnapshot ?? unset],
      ['ipCountrySnapshot', snapshot.ipCountrySnapshot ?? unset],
      ['ipCacheFresh', snapshot.ipCacheFresh === null ? '—' : yesNo(snapshot.ipCacheFresh)],
    );
  }

  return (
    <div className="mb-4 min-w-0 text-xs text-gray-600 dark:text-gray-400">
      <button
        type="button"
        aria-expanded={enabled}
        aria-controls={enabled ? regionId : undefined}
        onClick={() => setEnabled(!enabled)}
        className="rounded-lg px-2 py-1.5 text-left underline decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
      >
        {label('title')}
      </button>
      {enabled && (
        <section id={regionId} role="region" aria-label={label('title')}
          className="mt-2 min-w-0 rounded-xl border border-gray-300 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-3">{label('privacy')}</p>
          {!snapshot && <p className="mb-3" role="status">{label('waiting')}</p>}
          <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2">
            {rows.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="min-w-0 break-words">{label(key)}</dt>
                <dd className="max-w-[8rem] break-words text-right font-medium text-gray-900 dark:text-gray-100">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3">{label('snapshotNote')}</p>
        </section>
      )}
    </div>
  );
}
