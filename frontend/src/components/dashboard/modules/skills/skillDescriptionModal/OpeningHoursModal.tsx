'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OpeningHours } from './types';

interface OpeningHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: OpeningHours) => void;
  initialValue?: OpeningHours;
}

const DAYS = [
  { key: 'monday' as const, labelKey: 'skills.openingHours.monday', defaultLabel: 'Pondelok', shortLabel: 'Po' },
  { key: 'tuesday' as const, labelKey: 'skills.openingHours.tuesday', defaultLabel: 'Utorok', shortLabel: 'Ut' },
  { key: 'wednesday' as const, labelKey: 'skills.openingHours.wednesday', defaultLabel: 'Streda', shortLabel: 'St' },
  { key: 'thursday' as const, labelKey: 'skills.openingHours.thursday', defaultLabel: 'Štvrtok', shortLabel: 'Št' },
  { key: 'friday' as const, labelKey: 'skills.openingHours.friday', defaultLabel: 'Piatok', shortLabel: 'Pi' },
  { key: 'saturday' as const, labelKey: 'skills.openingHours.saturday', defaultLabel: 'Sobota', shortLabel: 'So' },
  { key: 'sunday' as const, labelKey: 'skills.openingHours.sunday', defaultLabel: 'Nedeľa', shortLabel: 'Ne' },
] as const;

export default function OpeningHoursModal({
  isOpen,
  onClose,
  onSave,
  initialValue,
}: OpeningHoursModalProps) {
  const { t } = useLanguage();
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});

  useEffect(() => {
    if (isOpen) {
      setOpeningHours(initialValue || {});
    }
  }, [isOpen, initialValue]);

  const handleDayToggle = (dayKey: keyof OpeningHours) => {
    const currentDay = openingHours[dayKey];
    if (currentDay?.enabled) {
      // Deaktivovať deň
      const updated = { ...openingHours };
      delete updated[dayKey];
      setOpeningHours(updated);
    } else {
      // Aktivovať deň s predvolenými hodnotami
      const updated = {
        ...openingHours,
        [dayKey]: {
          enabled: true,
          from: '08:00',
          to: '17:00',
        },
      };
      setOpeningHours(updated);
    }
  };

  const handleTimeChange = (dayKey: keyof OpeningHours, field: 'from' | 'to', time: string) => {
    const currentDay = openingHours[dayKey];
    if (!currentDay) return;

    const updated = {
      ...openingHours,
      [dayKey]: {
        ...currentDay,
        [field]: time,
      },
    };
    setOpeningHours(updated);
  };

  const handleCopyToAll = (fromDay: keyof OpeningHours) => {
    const sourceDay = openingHours[fromDay];
    if (!sourceDay?.enabled) return;

    const updated: OpeningHours = {};
    DAYS.forEach((day) => {
      updated[day.key] = {
        enabled: true,
        from: sourceDay.from,
        to: sourceDay.to,
      };
    });
    setOpeningHours(updated);
  };

  const handleSave = () => {
    onSave(openingHours);
    onClose();
  };

  if (!isOpen) return null;

    const hasAnyEnabled = Object.values(openingHours).some((day) => day && typeof day === 'object' && 'enabled' in day && day.enabled);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold">
              {t('skills.openingHours.title', 'Otváracia doba')}
            </h2>
            <button
              aria-label={t('common.close', 'Zavrieť')}
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t(
                'skills.openingHours.hint',
                'Nastav otváraciu dobu pre každý deň v týždni. Môžeš nastaviť rôzne časy pre rôzne dni.',
              )}
            </p>

            <div className="space-y-3">
              {DAYS.map((day) => {
                const dayData = openingHours[day.key];
                const isEnabled = dayData?.enabled || false;

                return (
                  <div
                    key={day.key}
                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                      isEnabled
                        ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <input
                        type="checkbox"
                        id={`opening-hours-${day.key}`}
                        checked={isEnabled}
                        onChange={() => handleDayToggle(day.key)}
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-400 dark:ring-offset-gray-800 focus:ring-2 cursor-pointer"
                      />
                      <label
                        htmlFor={`opening-hours-${day.key}`}
                        className={`text-sm font-medium cursor-pointer flex items-center gap-2 ${
                          isEnabled
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <span className="hidden sm:inline">{t(day.labelKey, day.defaultLabel)}</span>
                        <span className="sm:hidden">{day.shortLabel}</span>
                      </label>
                    </div>
                    {isEnabled && (
                      <>
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex items-center gap-2 flex-1">
                            <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {t('skills.openingHours.from', 'Od:')}
                            </label>
                            <input
                              type="time"
                              value={dayData?.from || '08:00'}
                              onChange={(e) => handleTimeChange(day.key, 'from', e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                            />
                          </div>
                          <span className="text-gray-400 dark:text-gray-500 mx-1">-</span>
                          <div className="flex items-center gap-2 flex-1">
                            <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {t('skills.openingHours.to', 'Do:')}
                            </label>
                            <input
                              type="time"
                              value={dayData?.to || '17:00'}
                              onChange={(e) => handleTimeChange(day.key, 'to', e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyToAll(day.key)}
                          className="px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors whitespace-nowrap"
                          title={t('skills.openingHours.copyToAll', 'Skopírovať na všetky dni')}
                        >
                          {t('skills.openingHours.copy', 'Kopírovať')}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {!hasAnyEnabled && (
              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                {t('skills.openingHours.noDaysSelected', 'Vyber aspoň jeden deň a nastav otváraciu dobu.')}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                {t('common.cancel', 'Zrušiť')}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 rounded-xl bg-purple-600 text-white px-4 py-2 hover:bg-purple-700 transition-colors"
              >
                {t('common.save', 'Uložiť')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

