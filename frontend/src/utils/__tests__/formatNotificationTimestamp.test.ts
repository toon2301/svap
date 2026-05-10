import {
  formatNotificationTimestamp,
  type NotificationTimeSuffixes,
} from '../formatNotificationTimestamp';

const sfx: NotificationTimeSuffixes = {
  minutes: 'm',
  hours: 'h',
  days: 'd',
};

const MS_DAY = 24 * 60 * 60_000;

describe('formatNotificationTimestamp', () => {
  const anchor = Date.UTC(2026, 4, 10, 12, 0, 0, 0); // 2026-05-10 12:00 UTC

  it('returns empty string for invalid input', () => {
    expect(formatNotificationTimestamp('', 'sk', sfx, anchor)).toBe('');
    expect(formatNotificationTimestamp('not-a-date', 'sk', sfx, anchor)).toBe('');
  });

  it('shows minutes when under 1 hour', () => {
    const created = new Date(anchor - 3 * 60_000).toISOString();
    expect(formatNotificationTimestamp(created, 'sk', sfx, anchor)).toBe('3 m');
  });

  it('shows at least 1 minute for positive sub-minute age', () => {
    const created = new Date(anchor - 30_000).toISOString();
    expect(formatNotificationTimestamp(created, 'sk', sfx, anchor)).toBe('1 m');
  });

  it('shows 0 minutes only when timestamps coincide', () => {
    const created = new Date(anchor).toISOString();
    expect(formatNotificationTimestamp(created, 'sk', sfx, anchor)).toBe('0 m');
  });

  it('shows hours from 1 hour until before 24 hours', () => {
    const threeHours = new Date(anchor - 3 * 60 * 60_000).toISOString();
    expect(formatNotificationTimestamp(threeHours, 'sk', sfx, anchor)).toBe('3 h');

    const almostDay = new Date(anchor - 23 * 60 * 60_000).toISOString();
    expect(formatNotificationTimestamp(almostDay, 'sk', sfx, anchor)).toBe('23 h');
  });

  it('shows days from 24 hours until before 7 days', () => {
    const oneDay = new Date(anchor - MS_DAY).toISOString();
    expect(formatNotificationTimestamp(oneDay, 'sk', sfx, anchor)).toBe('1 d');

    const sixDays = new Date(anchor - 6 * MS_DAY).toISOString();
    expect(formatNotificationTimestamp(sixDays, 'sk', sfx, anchor)).toBe('6 d');
  });

  it('shows calendar date without time when 7 days or older (same year)', () => {
    const eightDays = new Date(anchor - 8 * MS_DAY).toISOString();
    const out = formatNotificationTimestamp(eightDays, 'sk', sfx, anchor);
    expect(out).not.toMatch(/\d{1,2}:\d{2}/);
    expect(out.length).toBeGreaterThan(0);
  });

  it('includes year when notification year differs from now year', () => {
    const old = Date.UTC(2024, 2, 8, 10, 0, 0);
    const iso = new Date(old).toISOString();
    const out = formatNotificationTimestamp(iso, 'en', sfx, anchor);
    expect(out).toMatch(/2024/);
  });

  it('clamps negative diff (future timestamps) to relative buckets from zero', () => {
    const future = new Date(anchor + 60_000).toISOString();
    expect(formatNotificationTimestamp(future, 'sk', sfx, anchor)).toBe('0 m');
  });
});
