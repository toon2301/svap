import { isOfferWatchMatchNew } from '../offerWatchMatchFreshness';

const NOW = Date.parse('2026-09-02T12:00:00Z');

describe('isOfferWatchMatchNew', () => {
  it('keeps the badge for less than twelve hours', () => {
    expect(isOfferWatchMatchNew(
      { createdAt: '2026-09-02T00:00:01Z' },
      NOW,
    )).toBe(true);
  });

  it('removes the badge exactly at twelve hours', () => {
    expect(isOfferWatchMatchNew(
      { createdAt: '2026-09-02T00:00:00Z' },
      NOW,
    )).toBe(false);
  });

  it('does not label malformed or future timestamps as new', () => {
    expect(isOfferWatchMatchNew({ createdAt: 'invalid' }, NOW)).toBe(false);
    expect(isOfferWatchMatchNew(
      { createdAt: '2026-09-02T12:00:01Z' },
      NOW,
    )).toBe(false);
  });
});

