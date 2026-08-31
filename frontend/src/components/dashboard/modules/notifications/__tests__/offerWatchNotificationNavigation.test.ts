import {
  dispatchOfferWatchNotificationNavigation,
  parseOfferWatchNotificationTarget,
} from '../offerWatchNotificationNavigation';

describe('offerWatchNotificationNavigation', () => {
  it.each([
    [
      '/dashboard/users/watch-owner?highlight=42',
      { identifier: 'watch-owner', highlightId: 42 },
    ],
    [
      '/dashboard/users/15/?offer=7',
      { identifier: '15', highlightId: 7 },
    ],
    [
      '/dashboard/users/j%C3%A1n-nov%C3%A1k?highlight=9',
      { identifier: 'ján-novák', highlightId: 9 },
    ],
  ])('parses a safe dashboard profile target %s', (targetUrl, expected) => {
    expect(parseOfferWatchNotificationTarget(targetUrl)).toEqual(expected);
  });

  it.each([
    'https://example.com/dashboard/users/watch-owner?highlight=42',
    '//example.com/dashboard/users/watch-owner?highlight=42',
    '/dashboard/profile?highlight=42',
    '/dashboard/users/watch-owner',
    '/dashboard/users/watch-owner?highlight=0',
    '/dashboard/users/watch-owner?highlight=-1',
    '/dashboard/users/watch-owner?highlight=1.5',
    '/dashboard/users/watch-owner?highlight=not-a-number',
    '/dashboard/users/%2F?highlight=42',
    '/dashboard/users/%E0%A4%A?highlight=42',
  ])('rejects an unsafe or incomplete target %s', (targetUrl) => {
    expect(parseOfferWatchNotificationTarget(targetUrl)).toBeNull();
  });

  it('dispatches one canonical profile navigation event', () => {
    const listener = jest.fn();
    window.addEventListener('goToUserProfile', listener);

    try {
      expect(
        dispatchOfferWatchNotificationNavigation(
          '/dashboard/users/watch-owner?highlight=42',
        ),
      ).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
      expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
        identifier: 'watch-owner',
        highlightId: 42,
      });
    } finally {
      window.removeEventListener('goToUserProfile', listener);
    }
  });

  it('does not dispatch an event for an invalid target', () => {
    const listener = jest.fn();
    window.addEventListener('goToUserProfile', listener);

    try {
      expect(dispatchOfferWatchNotificationNavigation('/dashboard/users/watch-owner')).toBe(
        false,
      );
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('goToUserProfile', listener);
    }
  });
});
