/**
 * Relative / absolute timestamp for notification lists.
 * Uses client clock only; no network or stored preferences.
 */

export type NotificationTimeSuffixes = {
  minutes: string;
  hours: string;
  days: string;
};

const MS_MINUTE = 60_000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;
const SEVEN_DAYS_MS = 7 * MS_DAY;

function sanitizeSuffix(value: string): string {
  const s = value.trim();
  return s.length > 16 ? s.slice(0, 16) : s;
}

function minuteCount(diffMs: number): number {
  if (diffMs <= 0) return 0;
  const raw = Math.floor(diffMs / MS_MINUTE);
  return raw < 1 ? 1 : raw;
}

/**
 * @param isoOrTimestamp - ISO string from API (trimmed before parse)
 * @param locale - BCP 47 language tag (e.g. sk, en, cs)
 * @param suffixes - localized short suffixes for minutes / hours / days
 * @param nowMs - injectable clock for tests (default: Date.now())
 */
export function formatNotificationTimestamp(
  isoOrTimestamp: string,
  locale: string,
  suffixes: NotificationTimeSuffixes,
  nowMs: number = Date.now(),
): string {
  if (typeof isoOrTimestamp !== 'string') return '';
  const trimmed = isoOrTimestamp.trim();
  if (!trimmed) return '';

  const created = new Date(trimmed);
  const createdMs = created.getTime();
  if (Number.isNaN(createdMs)) return '';

  let diffMs = nowMs - createdMs;
  if (diffMs < 0) diffMs = 0;

  const sm = sanitizeSuffix(suffixes.minutes);
  const sh = sanitizeSuffix(suffixes.hours);
  const sd = sanitizeSuffix(suffixes.days);

  if (diffMs < MS_HOUR) {
    const n = minuteCount(diffMs);
    return `${n} ${sm}`.trim();
  }

  if (diffMs < MS_DAY) {
    const h = Math.floor(diffMs / MS_HOUR);
    return `${h} ${sh}`.trim();
  }

  if (diffMs < SEVEN_DAYS_MS) {
    const d = Math.floor(diffMs / MS_DAY);
    return `${d} ${sd}`.trim();
  }

  const nowDate = new Date(nowMs);
  const nowYear = nowDate.getFullYear();
  const createdYear = created.getFullYear();

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
  };
  if (createdYear !== nowYear) {
    options.year = 'numeric';
  }

  try {
    return new Intl.DateTimeFormat(locale || 'sk', options).format(created);
  } catch {
    return new Intl.DateTimeFormat('sk', options).format(created);
  }
}
