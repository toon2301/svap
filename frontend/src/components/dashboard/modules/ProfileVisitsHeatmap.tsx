'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ProfileVisitDay {
  date: string; // 'YYYY-MM-DD'
  count: number;
}

export interface ProfileVisitsTrend {
  total_visits_90d: number;
  total_visits_recent_45d: number;
  total_visits_previous_45d: number;
  daily: ProfileVisitDay[];
}

// 5-stupňová fialová škála (index 0 = žiadna návšteva → najsvetlejšia/prázdna).
// Škála je RELATÍVNA k maximu obdobia (GitHub-contribution štýl), takže funguje
// pre nízku aj vysokú aktivitu. Používa existujúce Tailwind purple odtiene appky.
// Dark: v tmavom režime rastie intenzita OPAČNE (tmavá → svetlá), aby vyššia
// aktivita ostala výraznejšia na tmavom pozadí (rovnaká class-strategy ako inde).
const LEVEL_CLASSES = [
  'bg-gray-100 dark:bg-gray-800', // 0 – žiadna návšteva
  'bg-purple-200 dark:bg-purple-900', // 1
  'bg-purple-400 dark:bg-purple-700', // 2
  'bg-purple-600 dark:bg-purple-500', // 3
  'bg-purple-800 dark:bg-purple-300', // 4 – najviac
];

const CELL_RING = 'ring-1 ring-inset ring-black/5 dark:ring-white/10';

function intensityLevel(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

type TrendDirection = 'up' | 'down' | 'flat';

function getLeadingEmptyDays(date: string | undefined): number {
  if (!date) return 0;
  const [year, month, day] = date.split('-').map(Number);
  if (![year, month, day].every(Number.isFinite)) return 0;
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (weekday + 6) % 7; // pondelok = 0, nedeľa = 6
}

/**
 * Heatmapa návštev profilu za 90 dní (GitHub-contribution štýl) + hlavička s
 * celkovým číslom a trendom. Trend porovnáva posledných 45 dní voči predošlým
 * 45 dňom (obe polovice v rámci 90-dňového okna – porovnanie proti „predošlým
 * 90 dňom" nie je možné, tie dáta už zmazala 90-dňová retencia).
 *
 * Čisto prezentačný komponent – fetch/loading/error rieši StatisticsModule (fail-open).
 */
export default function ProfileVisitsHeatmap({
  trend,
}: {
  trend: ProfileVisitsTrend;
}) {
  const { locale, t } = useLanguage();
  const [activeDayDate, setActiveDayDate] = useState<string | null>(
    trend.daily.at(-1)?.date ?? null,
  );

  const recent = trend.total_visits_recent_45d;
  const previous = trend.total_visits_previous_45d;
  const delta = recent - previous;

  let direction: TrendDirection;
  let percentLabel: string;
  if (previous === 0) {
    // Bez základne sa percento nedá zmysluplne spočítať (delenie nulou).
    if (recent > 0) {
      direction = 'up';
      percentLabel = t('dashboard.visitsTrendNew', 'nové');
    } else {
      direction = 'flat';
      percentLabel = '0%';
    }
  } else {
    const p = Math.round((delta / previous) * 100);
    direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    percentLabel = `${p > 0 ? '+' : ''}${p}%`;
  }

  const trendColor =
    direction === 'up'
      ? 'text-green-700 dark:text-green-400'
      : direction === 'down'
        ? 'text-red-700 dark:text-red-400'
        : 'text-gray-500 dark:text-gray-400';
  const trendArrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';

  const maxCount = trend.daily.reduce(
    (m, d) => (d.count > m ? d.count : m),
    0,
  );

  const numberFormatter = new Intl.NumberFormat(locale);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const shortWeekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const fullWeekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, index + 1, 12);
    return {
      short: shortWeekdayFormatter.format(date).replace(/\.$/, ''),
      full: fullWeekdayFormatter.format(date),
    };
  });
  const leadingEmptyDays = getLeadingEmptyDays(trend.daily[0]?.date);
  const activeDay =
    trend.daily.find((day) => day.date === activeDayDate) ?? trend.daily.at(-1) ?? null;

  const formatDate = (date: string) => {
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? date : dateFormatter.format(parsed);
  };

  const describeDay = (day: ProfileVisitDay) =>
    `${formatDate(day.date)} · ${t('dashboard.visitsCountLabel', 'Počet návštev')}: ${numberFormatter.format(day.count)}`;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#101011] sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(180px,0.65fr)_minmax(0,1.35fr)] lg:items-center">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
            {t('dashboard.profileVisits', 'Návštevy profilu')}
          </h3>
          <div className="mt-3 text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            {numberFormatter.format(trend.total_visits_90d)}
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {t('dashboard.visitsIn90Days', 'návštev za 90 dní')}
          </div>
          <div
            data-testid="visits-trend"
            data-direction={direction}
            className={`mt-3 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm font-semibold ${trendColor}`}
          >
            <span aria-hidden="true">{trendArrow}</span>
            <span>{percentLabel}</span>
            <span className="font-normal text-gray-500 dark:text-gray-400">
              {t('dashboard.visitsTrendVsPrevious', 'oproti predošlým 45 dňom')}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mx-auto grid w-full max-w-[30rem] grid-cols-[auto_minmax(0,1fr)] gap-x-2">
            <div className="grid grid-rows-7 gap-1 text-[10px] leading-none text-gray-400 dark:text-gray-500">
              {weekdayLabels.map((label) => (
                <span
                  key={label.full}
                  data-testid="visits-weekday-label"
                  aria-label={label.full}
                  className="flex items-center justify-end font-medium"
                >
                  {label.short}
                </span>
              ))}
            </div>
            <div
              data-testid="visits-heatmap"
              role="group"
              aria-label={t('dashboard.visitsHeatmapLabel', 'Kalendár návštev za 90 dní')}
              className="grid w-full grid-flow-col grid-rows-7 auto-cols-fr gap-1"
            >
              {Array.from({ length: leadingEmptyDays }, (_, index) => (
                <span key={`empty-${index}`} aria-hidden="true" className="aspect-square w-full" />
              ))}
              {trend.daily.map((day) => {
                const level = intensityLevel(day.count, maxCount);
                const isActive = day.date === activeDay?.date;
                return (
                  <button
                    key={day.date}
                    type="button"
                    data-testid="visits-cell"
                    data-count={day.count}
                    aria-label={describeDay(day)}
                    aria-pressed={isActive}
                    onClick={() => setActiveDayDate(day.date)}
                    onFocus={() => setActiveDayDate(day.date)}
                    onMouseEnter={() => setActiveDayDate(day.date)}
                    className={`aspect-square w-full rounded-[3px] ${CELL_RING} ${LEVEL_CLASSES[level]} transition-transform hover:scale-110 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500`}
                  />
                );
              })}
            </div>
          </div>

          <p
            data-testid="visits-day-detail"
            className="mx-auto mt-3 min-h-5 w-full max-w-[30rem] text-xs text-gray-600 dark:text-gray-300"
            aria-live="polite"
          >
            {activeDay ? describeDay(activeDay) : ''}
          </p>

          <div className="mx-auto mt-2 flex w-full max-w-[30rem] items-center justify-end gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{t('dashboard.visitsLegendLess', 'menej')}</span>
            {LEVEL_CLASSES.map((className) => (
              <span
                key={className}
                aria-hidden="true"
                className={`h-3 w-3 rounded-[3px] ${CELL_RING} ${className}`}
              />
            ))}
            <span>{t('dashboard.visitsLegendMore', 'viac')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
