import { isOfferWatchMatchNew } from '../offerWatchMatchFreshness';

const NOW = Date.parse('2026-09-02T12:00:00Z');
const WATCH_ACTIVATED_AT = '2026-09-01T12:00:00Z';

describe('isOfferWatchMatchNew', () => {
  it('keeps the badge for less than twelve hours', () => {
    expect(isOfferWatchMatchNew(
      { createdAt: '2026-09-02T00:00:01Z' },
      WATCH_ACTIVATED_AT,
      NOW,
    )).toBe(true);
  });

  it('removes the badge exactly at twelve hours', () => {
    expect(isOfferWatchMatchNew(
      { createdAt: '2026-09-02T00:00:00Z' },
      WATCH_ACTIVATED_AT,
      NOW,
    )).toBe(false);
  });

  it('does not label malformed or future timestamps as new', () => {
    expect(isOfferWatchMatchNew(
      { createdAt: 'invalid' },
      WATCH_ACTIVATED_AT,
      NOW,
    )).toBe(false);
    expect(isOfferWatchMatchNew(
      { createdAt: '2026-09-02T12:00:01Z' },
      WATCH_ACTIVATED_AT,
      NOW,
    )).toBe(false);
  });

  it('does not mark a recent card that already existed when the watch was activated', () => {
    expect(isOfferWatchMatchNew(
      { createdAt: '2026-09-02T11:00:00Z' },
      '2026-09-02T11:30:00Z',
      NOW,
    )).toBe(false);
    expect(isOfferWatchMatchNew(
      { createdAt: '2026-09-02T11:30:00Z' },
      '2026-09-02T11:30:00Z',
      NOW,
    )).toBe(false);
  });

  it('marks a recent card created after the watch activation', () => {
    expect(isOfferWatchMatchNew(
      { createdAt: '2026-09-02T11:31:00Z' },
      '2026-09-02T11:30:00Z',
      NOW,
    )).toBe(true);
  });

  it('does not label a match when the watch timestamp is malformed', () => {
    expect(isOfferWatchMatchNew(
      { createdAt: '2026-09-02T11:31:00Z' },
      'invalid',
      NOW,
    )).toBe(false);
  });
});
