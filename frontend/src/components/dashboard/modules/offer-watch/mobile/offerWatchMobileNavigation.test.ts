import {
  OFFER_WATCH_MOBILE_REQUEST_EVENT,
  OFFER_WATCH_SETTINGS_PATH,
  hasOfferWatchSettingsReturnHistory,
  isOfferWatchSettingsPath,
  readOfferWatchMobileHistory,
  requestOfferWatchMobile,
  withOfferWatchMobileHistory,
  withOfferWatchSettingsReturnHistory,
  withoutOfferWatchMobileHistory,
  withoutOfferWatchSettingsReturnHistory,
  type OfferWatchMobileHistory,
} from './offerWatchMobileNavigation';

describe('offerWatchMobileNavigation', () => {
  const marker: OfferWatchMobileHistory = {
    version: 2,
    origin: 'settings',
    view: { kind: 'edit', watchId: 7 },
  };

  it('recognizes only the canonical settings route with an optional trailing slash', () => {
    expect(isOfferWatchSettingsPath(OFFER_WATCH_SETTINGS_PATH)).toBe(true);
    expect(isOfferWatchSettingsPath(`${OFFER_WATCH_SETTINGS_PATH}/`)).toBe(true);
    expect(isOfferWatchSettingsPath('/dashboard/settings')).toBe(false);
    expect(isOfferWatchSettingsPath(`${OFFER_WATCH_SETTINGS_PATH}/extra`)).toBe(false);
  });

  it('stores and removes a valid marker without losing unrelated history state', () => {
    const state = withOfferWatchMobileHistory({ preserved: 42 }, marker);

    expect(readOfferWatchMobileHistory(state)).toEqual(marker);
    expect(state.preserved).toBe(42);
    expect(withoutOfferWatchMobileHistory(state)).toEqual({ preserved: 42 });
  });

  it.each([
    null,
    { __svaplyOfferWatchMobile: { version: 1, origin: 'settings', view: { kind: 'list' } } },
    { __svaplyOfferWatchMobile: { version: 2, origin: 'unknown', view: { kind: 'list' } } },
    { __svaplyOfferWatchMobile: { version: 2, origin: 'settings', view: { kind: 'edit', watchId: 0 } } },
    { __svaplyOfferWatchMobile: { version: 2, origin: 'settings', view: { kind: 'edit', watchId: 1.5 } } },
  ])('rejects malformed history state %#', (state) => {
    expect(readOfferWatchMobileHistory(state)).toBeNull();
  });

  it('stores and consumes the settings-return marker independently', () => {
    const marked = withOfferWatchSettingsReturnHistory({ preserved: 42 });

    expect(hasOfferWatchSettingsReturnHistory(marked)).toBe(true);
    expect(withoutOfferWatchSettingsReturnHistory(marked)).toEqual({ preserved: 42 });
    expect(hasOfferWatchSettingsReturnHistory({
      __svaplyOfferWatchSettingsReturn: { version: 2 },
    })).toBe(false);
  });

  it('dispatches the dedicated open request event', () => {
    const listener = jest.fn();
    window.addEventListener(OFFER_WATCH_MOBILE_REQUEST_EVENT, listener);

    requestOfferWatchMobile();

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(OFFER_WATCH_MOBILE_REQUEST_EVENT, listener);
  });
});
