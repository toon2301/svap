'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export type DayOpeningHours = {
  enabled: boolean;
  from: string;
  to: string;
};

export type OpeningHours = {
  monday?: DayOpeningHours;
  tuesday?: DayOpeningHours;
  wednesday?: DayOpeningHours;
  thursday?: DayOpeningHours;
  friday?: DayOpeningHours;
  saturday?: DayOpeningHours;
  sunday?: DayOpeningHours;
};

interface OpeningHoursSectionProps {
  value: OpeningHours;
  onChange: (value: OpeningHours) => void;
}

const DAYS = [
  { key: 'monday' as const, labelKey: 'skills.openingHours.monday', defaultLabel: 'Pondelok' },
  { key: 'tuesday' as const, labelKey: 'skills.openingHours.tuesday', defaultLabel: 'Utorok' },
  { key: 'wednesday' as const, labelKey: 'skills.openingHours.wednesday', defaultLabel: 'Streda' },
  { key: 'thursday' as const, labelKey: 'skills.openingHours.thursday', defaultLabel: 'Štvrtok' },
  { key: 'friday' as const, labelKey: 'skills.openingHours.friday', defaultLabel: 'Piatok' },
  { key: 'saturday' as const, labelKey: 'skills.openingHours.saturday', defaultLabel: 'Sobota' },
  { key: 'sunday' as const, labelKey: 'skills.openingHours.sunday', defaultLabel: 'Nedeľa' },
] as const;

export default function OpeningHoursSection({ value, onChange }: OpeningHoursSectionProps) {
  const { t } = useLanguage();

  const handleDayToggle = (dayKey: keyof OpeningHours) => {
    const currentDay = value[dayKey];
    if (currentDay?.enabled) {
      // Deaktivovať deň
      const updated = { ...value };
      delete updated[dayKey];
      onChange(updated);
    } else {
      // Aktivovať deň s predvolenými hodnotami
      const updated = {
        ...value,
        [dayKey]: {
          enabled: true,
          from: '08:00',
          to: '17:00',
        },
      };
      onChange(updated);
    }
  };

  const handleTimeChange = (dayKey: keyof OpeningHours, field: 'from' | 'to', time: string) => {
    const currentDay = value[dayKey];
    if (!currentDay) return;

    const updated = {
      ...value,
      [dayKey]: {
        ...currentDay,
        [field]: time,
      },
    };
    onChange(updated);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {t('skills.openingHours.title', 'Otváracia doba (voliteľné)')}
      </label>
      <div className="space-y-2.5">
        {DAYS.map((day) => {
          const dayData = value[day.key];
          const isEnabled = dayData?.enabled || false;

          return (
            <div key={day.key} className="flex items-center gap-3">
              <div className="flex items-center gap-2 min-w-[100px]">
                <input
                  type="checkbox"
                  id={`opening-hours-${day.key}`}
                  checked={isEnabled}
                  onChange={() => handleDayToggle(day.key)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-400 dark:ring-offset-gray-800 focus:ring-2"
                />
                <label
                  htmlFor={`opening-hours-${day.key}`}
                  className={`text-sm font-medium cursor-pointer ${
                    isEnabled
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t(day.labelKey, day.defaultLabel)}
                </label>
              </div>
              {isEnabled && (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={dayData?.from || '08:00'}
                    onChange={(e) => handleTimeChange(day.key, 'from', e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                  <input
                    type="time"
                    value={dayData?.to || '17:00'}
                    onChange={(e) => handleTimeChange(day.key, 'to', e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        {t('skills.openingHours.hint', 'Nastav otváraciu dobu pre každý deň v týždni.')}
      </p>
    </div>
  );
}

