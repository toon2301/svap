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

  it.each(['category', 'country', 'district'] as const)(
    'round-trips the %s picker only inside a create or edit view',
    (picker) => {
      const createMarker: OfferWatchMobileHistory = {
        version: 2,
        origin: 'settings',
        view: { kind: 'create', picker },
      };
      const editMarker: OfferWatchMobileHistory = {
        version: 2,
        origin: 'direct',
        view: { kind: 'edit', watchId: 8, picker },
      };

      expect(readOfferWatchMobileHistory(withOfferWatchMobileHistory({}, createMarker)))
        .toEqual(createMarker);
      expect(readOfferWatchMobileHistory(withOfferWatchMobileHistory({}, editMarker)))
        .toEqual(editMarker);
    },
  );

  it.each([
    null,
    { __svaplyOfferWatchMobile: { version: 1, origin: 'settings', view: { kind: 'list' } } },
    { __svaplyOfferWatchMobile: { version: 2, origin: 'unknown', view: { kind: 'list' } } },
    { __svaplyOfferWatchMobile: { version: 2, origin: 'settings', view: { kind: 'edit', watchId: 0 } } },
    { __svaplyOfferWatchMobile: { version: 2, origin: 'settings', view: { kind: 'edit', watchId: 1.5 } } },
    { __svaplyOfferWatchMobile: { version: 2, origin: 'settings', view: { kind: 'list', picker: 'country' } } },
    { __svaplyOfferWatchMobile: { version: 2, origin: 'settings', view: { kind: 'create', picker: 'currency' } } },
    { __svaplyOfferWatchMobile: { version: 2, origin: 'settings', view: { kind: 'edit', watchId: 7, picker: '' } } },
  ])('rejects malformed history state %#', (state) => {
    expect(readOfferWatchMobileHistory(state)).toBeNull();
  });

  it('returns a sanitized marker without unrelated untrusted properties', () => {
    expect(readOfferWatchMobileHistory({
      __svaplyOfferWatchMobile: {
        version: 2,
        origin: 'settings',
        ignored: 'value',
        view: { kind: 'edit', watchId: 7, picker: 'district', ignored: true },
      },
    })).toEqual({
      version: 2,
      origin: 'settings',
      view: { kind: 'edit', watchId: 7, picker: 'district' },
    });
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
