'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OpeningHours } from './types';
import MasterToggle from '../../notifications/MasterToggle';

interface OpeningHoursContentProps {
  openingHours: OpeningHours;
  setOpeningHours: React.Dispatch<React.SetStateAction<OpeningHours>>;
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

type DayKey = keyof OpeningHours;

export default function OpeningHoursContent({
  openingHours,
  setOpeningHours,
}: OpeningHoursContentProps) {
  const { t } = useLanguage();
  const [masterToggleEnabled, setMasterToggleEnabled] = useState(false);
  const [previousHours, setPreviousHours] = useState<OpeningHours>({});
  const [activePreset, setActivePreset] = useState<'workday_9_17' | 'workday_8_16' | 'nonstop' | 'weekend' | null>(null);

  // Funkcia na zistenie aktívneho presetu
  const detectActivePreset = (hours: OpeningHours): 'workday_9_17' | 'workday_8_16' | 'nonstop' | 'weekend' | null => {
    const enabledDays = Object.keys(hours).filter(key => hours[key as DayKey]?.enabled);
    if (enabledDays.length === 0) return null;

    // Nonstop - všetky dni 00:00-23:59
    const isNonstop = enabledDays.length === 7 && enabledDays.every(key => {
      const day = hours[key as DayKey];
      return day?.from === '00:00' && day?.to === '23:59';
    });
    if (isNonstop) return 'nonstop';

    // Weekend - len sobota a nedeľa
    const isWeekend = enabledDays.length === 2 && 
      enabledDays.includes('saturday') && enabledDays.includes('sunday') &&
      hours.saturday?.from === '09:00' && hours.saturday?.to === '17:00' &&
      hours.sunday?.from === '09:00' && hours.sunday?.to === '17:00';
    if (isWeekend) return 'weekend';

    // Workday - pondelok až piatok
    const workdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const isWorkday = enabledDays.length === 5 && 
      workdays.every(day => enabledDays.includes(day)) &&
      enabledDays.every(key => {
        const day = hours[key as DayKey];
        return day && (day.from === '09:00' || day.from === '08:00') && 
               (day.to === '17:00' || day.to === '16:00');
      });

    if (isWorkday) {
      const firstDay = hours[workdays[0] as DayKey];
      if (firstDay?.from === '09:00' && firstDay?.to === '17:00') {
        return 'workday_9_17';
      }
      if (firstDay?.from === '08:00' && firstDay?.to === '16:00') {
        return 'workday_8_16';
      }
    }

    return null;
  };

  // Aktualizovať aktívny preset keď sa zmenia openingHours
  useEffect(() => {
    if (!masterToggleEnabled) {
      const detected = detectActivePreset(openingHours);
      setActivePreset(detected);
    } else {
      setActivePreset(null);
    }
  }, [openingHours, masterToggleEnabled]);

  const handleMasterToggleChange = (enabled: boolean) => {
    if (enabled) {
      setPreviousHours({ ...openingHours });
      setOpeningHours({});
    } else {
      setOpeningHours({ ...previousHours });
    }
    setMasterToggleEnabled(enabled);
  };

  const handleDayToggle = (dayKey: keyof OpeningHours) => {
    if (masterToggleEnabled) return;
    
    const currentDay = openingHours[dayKey];
    if (currentDay?.enabled) {
      const updated = { ...openingHours };
      delete updated[dayKey];
      setOpeningHours(updated);
    } else {
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

  const formatTime = (time: string | undefined): string => {
    if (!time) return '08:00';
    // Zajistiť formát HH:MM
    const parts = time.split(':');
    if (parts.length !== 2) return time;
    const hours = parts[0].padStart(2, '0');
    const minutes = parts[1].padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleTimeChange = (dayKey: keyof OpeningHours, field: 'from' | 'to', time: string) => {
    const currentDay = openingHours[dayKey];
    if (!currentDay) return;

    const formattedTime = formatTime(time);
    const updated = {
      ...openingHours,
      [dayKey]: {
        ...currentDay,
        [field]: formattedTime,
      },
    };
    setOpeningHours(updated);
  };

  const applyPreset = (preset: 'workday_9_17' | 'workday_8_16' | 'nonstop' | 'weekend') => {
    if (masterToggleEnabled) return;
    
    const next: OpeningHours = {};

    if (preset === 'workday_9_17' || preset === 'workday_8_16') {
      const from = preset === 'workday_9_17' ? '09:00' : '08:00';
      const to = preset === 'workday_9_17' ? '17:00' : '16:00';
      DAYS.forEach((day) => {
        if (['saturday', 'sunday'].includes(day.key)) return;
        next[day.key as DayKey] = { enabled: true, from, to };
      });
    }

    if (preset === 'nonstop') {
      DAYS.forEach((day) => {
        next[day.key as DayKey] = { enabled: true, from: '00:00', to: '23:59' };
      });
    }

    if (preset === 'weekend') {
      DAYS.forEach((day) => {
        if (day.key === 'saturday' || day.key === 'sunday') {
          next[day.key as DayKey] = { enabled: true, from: '09:00', to: '17:00' };
        }
      });
    }

    setOpeningHours(next);
    setActivePreset(preset);
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

  const buildSummary = (hours: OpeningHours): string => {
    const groups: { from: string; to: string; days: string[] }[] = [];

    DAYS.forEach((day) => {
      const data = hours[day.key];
      if (!data?.enabled) return;
      const from = data.from || '00:00';
      const to = data.to || '23:59';
      const last = groups[groups.length - 1];
      if (last && last.from === from && last.to === to) {
        last.days.push(day.shortLabel);
      } else {
        groups.push({ from, to, days: [day.shortLabel] });
      }
    });

    const parts = groups.map((g) => {
      if (g.days.length === 1) return `${g.days[0]}: ${g.from}–${g.to}`;
      return `${g.days[0]}–${g.days[g.days.length - 1]}: ${g.from}–${g.to}`;
    });

    return parts.join(', ');
  };

  const hasAnyEnabled = Object.values(openingHours).some(
    (day) => day && typeof day === 'object' && 'enabled' in day && day.enabled,
  );

  return (
    <div className="px-4 py-4 space-y-4">
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
        {t(
          'skills.openingHours.hint',
          'Nastav otváraciu dobu pre každý deň v týždni. Môžeš nastaviť rôzne časy pre rôzne dni.',
        )}
      </p>

      <div className="pt-1">
        <MasterToggle
          enabled={masterToggleEnabled}
          onChange={handleMasterToggleChange}
          label={t('skills.openingHours.turnOffAll', 'Vypnúť všetky dni')}
        />
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t('skills.openingHours.presets', 'Rýchle nastavenia:')}
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => applyPreset('workday_9_17')}
            className={`px-3 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              activePreset === 'workday_9_17'
                ? 'bg-purple-600 text-white hover:bg-purple-700 border border-purple-600 dark:bg-purple-500 dark:text-white dark:hover:bg-purple-600 dark:border-purple-500'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-gray-900/60 dark:border-gray-700'
            }`}
          >
            {t('skills.openingHours.preset.workday_9_17', 'Po–Pi 9:00–17:00')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('workday_8_16')}
            className={`px-3 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              activePreset === 'workday_8_16'
                ? 'bg-purple-600 text-white hover:bg-purple-700 border border-purple-600 dark:bg-purple-500 dark:text-white dark:hover:bg-purple-600 dark:border-purple-500'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-gray-900/60 dark:border-gray-700'
            }`}
          >
            {t('skills.openingHours.preset.workday_8_16', 'Po–Pi 8:00–16:00')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('nonstop')}
            className={`px-3 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              activePreset === 'nonstop'
                ? 'bg-purple-600 text-white hover:bg-purple-700 border border-purple-600 dark:bg-purple-500 dark:text-white dark:hover:bg-purple-600 dark:border-purple-500'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-gray-900/60 dark:border-gray-700'
            }`}
          >
            {t('skills.openingHours.preset.nonstop', 'Nonstop (24/7)')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('weekend')}
            className={`px-3 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              activePreset === 'weekend'
                ? 'bg-purple-600 text-white hover:bg-purple-700 border border-purple-600 dark:bg-purple-500 dark:text-white dark:hover:bg-purple-600 dark:border-purple-500'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-gray-900/60 dark:border-gray-700'
            }`}
          >
            {t('skills.openingHours.preset.weekend', 'Len víkend')}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {DAYS.map((day, index) => {
          const dayData = openingHours[day.key];
          const isEnabled = dayData?.enabled || false;

          // Template pre pondelok - potom aplikujeme na všetky dni
          if (index === 0) {
            // Pondelok - template layout
            return (
              <div
                key={day.key}
                className={`py-1.5 px-2 rounded-xl border transition-all ${
                  isEnabled
                    ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10'
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Ľavá strana - toggle switch vľavo a názov dňa vpravo */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      onClick={() => handleDayToggle(day.key)}
                      disabled={masterToggleEnabled}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                        isEnabled
                          ? 'bg-purple-400 border border-purple-400'
                          : 'bg-gray-300 dark:bg-gray-600'
                      } ${masterToggleEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        transform: 'scaleY(0.8)',
                        transformOrigin: 'left center',
                      }}
                    >
                      <span
                        className={`absolute h-3 w-3 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                          isEnabled ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </button>
                    {/* Názov dňa */}
                    <button
                      type="button"
                      onClick={() => handleDayToggle(day.key)}
                      disabled={masterToggleEnabled}
                      className={`text-xs font-medium focus:outline-none leading-tight ${
                        isEnabled
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      } ${masterToggleEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {t(day.labelKey, day.defaultLabel)}
                    </button>
                  </div>
                  {/* Časové polia - vertikálne na pravej strane */}
                  {isEnabled && !masterToggleEnabled && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {t('skills.openingHours.from', 'Od:')}
                        </span>
                        <input
                          type="time"
                          value={formatTime(dayData?.from)}
                          onChange={(e) => handleTimeChange(day.key, 'from', e.target.value)}
                          disabled={masterToggleEnabled}
                          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ width: '85px', minWidth: '85px' }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {t('skills.openingHours.to', 'Do:')}
                        </span>
                        <input
                          type="time"
                          value={formatTime(dayData?.to)}
                          onChange={(e) => handleTimeChange(day.key, 'to', e.target.value)}
                          disabled={masterToggleEnabled}
                          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ width: '85px', minWidth: '85px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Ostatné dni - použijeme rovnaký layout ako pondelok
          return (
            <div
              key={day.key}
              className={`py-1.5 px-2 rounded-xl border transition-all ${
                isEnabled
                  ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10'
                  : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Ľavá strana - toggle switch vľavo a názov dňa vpravo */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={() => handleDayToggle(day.key)}
                    disabled={masterToggleEnabled}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      isEnabled
                        ? 'bg-purple-400 border border-purple-400'
                        : 'bg-gray-300 dark:bg-gray-600'
                    } ${masterToggleEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{
                      transform: 'scaleY(0.8)',
                      transformOrigin: 'left center',
                    }}
                  >
                    <span
                      className={`absolute h-3 w-3 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                        isEnabled ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                  {/* Názov dňa */}
                  <button
                    type="button"
                    onClick={() => handleDayToggle(day.key)}
                    disabled={masterToggleEnabled}
                    className={`text-xs font-medium focus:outline-none leading-tight ${
                      isEnabled
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    } ${masterToggleEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {t(day.labelKey, day.defaultLabel)}
                  </button>
                </div>
                {/* Časové polia - vertikálne na pravej strane */}
                {isEnabled && !masterToggleEnabled && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {t('skills.openingHours.from', 'Od:')}
                      </span>
                      <input
                        type="time"
                        value={formatTime(dayData?.from)}
                        onChange={(e) => handleTimeChange(day.key, 'from', e.target.value)}
                        disabled={masterToggleEnabled}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ width: '85px', minWidth: '85px' }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {t('skills.openingHours.to', 'Do:')}
                      </span>
                      <input
                        type="time"
                        value={formatTime(dayData?.to)}
                        onChange={(e) => handleTimeChange(day.key, 'to', e.target.value)}
                        disabled={masterToggleEnabled}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ width: '85px', minWidth: '85px' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!hasAnyEnabled && (
        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
          {t('skills.openingHours.noDaysSelected', 'Vyber aspoň jeden deň a nastav otváraciu dobu.')}
        </div>
      )}

      {hasAnyEnabled && (
        <div className="mt-2 rounded-xl bg-gray-50/80 dark:bg-[#111111] px-4 py-3 text-xs text-gray-600 dark:text-gray-300 border border-dashed border-gray-200 dark:border-gray-700">
          <p className="font-medium mb-1">
            {t('skills.openingHours.summaryTitle', 'Zhrnutie otváracej doby')}
          </p>
          <p>
            {buildSummary(openingHours) ||
              t('skills.openingHours.noDaysSelected', 'Vyber aspoň jeden deň a nastav otváraciu dobu.')}
          </p>
        </div>
      )}
    </div>
  );
}

