'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OpeningHours } from '../skills/skillDescriptionModal/types';
import { HOURS_DAYS } from './profileOffersTypes';

interface ProfileOpeningHoursMobileModalProps {
  hours: OpeningHours | null;
  onClose: () => void;
}

export function ProfileOpeningHoursMobileModal({ hours, onClose }: ProfileOpeningHoursMobileModalProps) {
  const { t } = useLanguage();

  if (!hours || typeof document === 'undefined') return null;

  const hasAny = HOURS_DAYS.some((d) => {
    const data = hours[d.key as keyof OpeningHours];
    return data && (data as any).enabled;
  });

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/45"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-[71] flex items-center justify-center px-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-xs rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-gray-200 dark:border-gray-700 shadow-2xl p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm font-semibold">
                {t('skills.openingHours.title', 'Otváracie hodiny')}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close', 'Zatvoriť')}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="rounded-xl bg-gray-50/80 dark:bg-[#101012] border border-gray-200/70 dark:border-gray-700/60 px-3 py-2 space-y-1 max-h-64 overflow-y-auto subtle-scrollbar">
            {hasAny ? (
              HOURS_DAYS.map((day) => {
                const data = hours[day.key as keyof OpeningHours] as any;
                if (!data || !data.enabled) return null;
                return (
                  <div
                    key={day.key}
                    className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-200"
                  >
                    <span className="font-medium w-10">{day.shortLabel}</span>
                    <span className="tabular-nums">
                      {data.from || '—'} – {data.to || '—'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                {t(
                  'skills.openingHours.empty',
                  'Otváracie hodiny zatiaľ nie sú nastavené alebo je prevádzka zatvorená.',
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.getElementById('app-root') ?? document.body,
  );
}


