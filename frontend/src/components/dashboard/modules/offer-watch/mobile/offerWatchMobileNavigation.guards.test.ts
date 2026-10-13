import {
  OFFER_WATCH_MOBILE_REQUEST_EVENT,
  readOfferWatchMobileHistory,
  readOfferWatchMobileRequestOrigin,
  requestOfferWatchMobile,
  withOfferWatchMobileHistory,
  type OfferWatchMobileHistory,
} from './offerWatchMobileNavigation';

beforeEach(() => window.history.replaceState(null, '', '/dashboard/watches?watch=7#results'));

describe('mobile request origins and history guards', () => {
  it('emits explicit results metadata without changing the URL', () => {
    const listener = jest.fn();
    window.addEventListener(OFFER_WATCH_MOBILE_REQUEST_EVENT, listener);
    try {
      requestOfferWatchMobile('results');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
      expect(listener.mock.calls[0][0].detail).toEqual({ origin: 'results' });
      expect(readOfferWatchMobileRequestOrigin(listener.mock.calls[0][0])).toBe('results');
      expect(window.location.pathname).toBe('/dashboard/watches');
    } finally {
      window.removeEventListener(OFFER_WATCH_MOBILE_REQUEST_EVENT, listener);
    }
  });

  it.each([null, undefined, 'results', { origin: 'direct' }, { origin: 'unknown' }])(
    'does not accept malformed request metadata %#', (detail) => {
      expect(readOfferWatchMobileRequestOrigin(new CustomEvent(OFFER_WATCH_MOBILE_REQUEST_EVENT, { detail })))
        .toBe('settings');
    },
  );

  it.each(['/dashboard/settings', '/dashboard', '/dashboard/watches/extra', '/search?q=te'])(
    'does not accept a results request from %s', (path) => {
      window.history.replaceState(null, '', path);
      expect(readOfferWatchMobileRequestOrigin(new CustomEvent(OFFER_WATCH_MOBILE_REQUEST_EVENT, { detail: { origin: 'results' } })))
        .toBe('settings');
    },
  );

  it('accepts a canonical results URL with a trailing slash, query and fragment', () => {
    window.history.replaceState(null, '', '/dashboard/watches/?watch=7#results');
    expect(readOfferWatchMobileRequestOrigin(new CustomEvent(OFFER_WATCH_MOBILE_REQUEST_EVENT, { detail: { origin: 'results' } })))
      .toBe('results');
  });

  it.each([undefined, null, [], 'list', 42])('rejects an invalid saved view %#', (view) => {
    expect(readOfferWatchMobileHistory({ __svaplyOfferWatchMobile: { version: 2, origin: 'results', view } }))
      .toBeNull();
  });

  it.each(['list', 'create', 'edit'] as const)('round-trips results origin for %s while retaining unrelated state', (kind) => {
    const marker: OfferWatchMobileHistory = {
      version: 2,
      origin: 'results',
      view: kind === 'edit' ? { kind, watchId: 7 } : { kind },
    };
    const state = withOfferWatchMobileHistory({ nextInternal: 'preserved' }, marker);
    expect(readOfferWatchMobileHistory(state)).toEqual(marker);
    expect(state.nextInternal).toBe('preserved');
  });

  it('requests and origin parsing are safe without a browser', () => {
    const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')!;
    const event = new CustomEvent(OFFER_WATCH_MOBILE_REQUEST_EVENT, { detail: { origin: 'results' } });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: undefined });
    try {
      expect(() => requestOfferWatchMobile('results')).not.toThrow();
      expect(readOfferWatchMobileRequestOrigin(event)).toBe('settings');
    } finally {
      Object.defineProperty(globalThis, 'window', savedWindow);
    }
  });

  it('retains the documented path fallbacks if the route registry has no matching sections', () => {
    jest.doMock('../../../components/dashboardRoutes', () => ({ dashboardSectionPath: () => null }));
    try {
      jest.isolateModules(() => {
        const fallback = require('./offerWatchMobileNavigation');
        expect(fallback.OFFER_WATCH_SETTINGS_PATH).toBe('/dashboard/settings/watches');
        expect(fallback.OFFER_WATCH_RETURN_PATH).toBe('/dashboard/settings');
        expect(fallback.readOfferWatchMobileRequestOrigin(new CustomEvent(OFFER_WATCH_MOBILE_REQUEST_EVENT, { detail: { origin: 'results' } })))
          .toBe('results');
      });
    } finally {
      jest.dontMock('../../../components/dashboardRoutes');
    }
  });
});
