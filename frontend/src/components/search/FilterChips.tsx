'use client';

import React, { useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const CHIP_CONFIG: Array<{
  param: string;
  label: (value: string) => string;
}> = [
  { param: 'rating', label: (v) => `Rating ${v}+` },
  { param: 'price_min', label: (v) => `Min cena ${v}€` },
  { param: 'price_max', label: (v) => `Max cena ${v}€` },
  {
    param: 'type',
    label: (v) => (v === 'offer' ? 'Ponuky' : v === 'seeking' ? 'Hľadám' : v),
  },
];

export function FilterChips() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const removeParam = useCallback(
    (param: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(param);
      params.set('page', '1');
      const qs = params.toString();
      router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
    },
    [router, searchParams],
  );

  const clearAllFilters = useCallback(() => {
    const params = new URLSearchParams();
    const q = searchParams.get('q');
    const sort = searchParams.get('sort');
    if (q != null && q.trim() !== '') params.set('q', q.trim());
    if (sort != null && sort.trim() !== '') params.set('sort', sort.trim());
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
  }, [router, searchParams]);

  const chips: Array<{ param: string; label: string }> = [];

  for (const { param, label } of CHIP_CONFIG) {
    const value = searchParams.get(param);
    if (value != null && value.trim() !== '') {
      chips.push({ param, label: label(value.trim()) });
    }
  }

  if (chips.length === 0) return null;

  return (
    <div
      className="sticky top-0 z-20 py-2 flex flex-nowrap items-center gap-2 mb-4 overflow-x-auto whitespace-nowrap [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600"
      style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {chips.map(({ param, label }) => (
        <span
          key={param}
          className="inline-flex flex-shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800"
        >
          {label}
          <button
            type="button"
            onClick={() => removeParam(param)}
            aria-label={`Odstrániť filter ${label}`}
            className="p-0.5 rounded hover:bg-purple-200 dark:hover:bg-purple-800/60 transition-colors"
          >
            ✕
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={clearAllFilters}
        className="flex-shrink-0 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
      >
        Clear filters
      </button>
    </div>
  );
}
