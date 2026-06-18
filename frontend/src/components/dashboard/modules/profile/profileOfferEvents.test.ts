import {
  PROFILE_OFFERS_REFRESH_EVENT,
  ProfileOffersRefreshPayload,
  dispatchProfileOffersRefresh,
  readProfileOffersRefreshEvent,
} from './profileOfferEvents';

function captureNextEvent(): Promise<CustomEvent<ProfileOffersRefreshPayload>> {
  return new Promise((resolve) => {
    const handler = (e: Event) => {
      window.removeEventListener(PROFILE_OFFERS_REFRESH_EVENT, handler);
      resolve(e as CustomEvent<ProfileOffersRefreshPayload>);
    };
    window.addEventListener(PROFILE_OFFERS_REFRESH_EVENT, handler);
  });
}

describe('profileOfferEvents – deletedOfferId', () => {
  it('dispatchProfileOffersRefresh prenáša deletedOfferId v event detail', async () => {
    const eventPromise = captureNextEvent();
    dispatchProfileOffersRefresh({ ownerUserId: 1, deletedOfferId: 42 });
    const event = await eventPromise;
    expect(event.detail.deletedOfferId).toBe(42);
  });

  it('readProfileOffersRefreshEvent parsuje deletedOfferId', async () => {
    const eventPromise = captureNextEvent();
    dispatchProfileOffersRefresh({ ownerUserId: 1, deletedOfferId: 99 });
    const event = await eventPromise;
    const payload = readProfileOffersRefreshEvent(event);
    expect(payload).not.toBeNull();
    expect(payload?.deletedOfferId).toBe(99);
  });

  it('readProfileOffersRefreshEvent vracia null pre záporné deletedOfferId', () => {
    const fakeEvent = new CustomEvent(PROFILE_OFFERS_REFRESH_EVENT, {
      detail: { deletedOfferId: -5 },
    });
    const payload = readProfileOffersRefreshEvent(fakeEvent);
    expect(payload).toBeNull();
  });

  it('deletedOfferId je voliteľné – dispatch bez neho funguje', async () => {
    const eventPromise = captureNextEvent();
    dispatchProfileOffersRefresh({ ownerUserId: 1 });
    const event = await eventPromise;
    const payload = readProfileOffersRefreshEvent(event);
    expect(payload).not.toBeNull();
    expect(payload?.deletedOfferId).toBeUndefined();
  });

  it('dispatch ignoruje neplatné deletedOfferId (0)', () => {
    const spy = jest.fn();
    window.addEventListener(PROFILE_OFFERS_REFRESH_EVENT, spy);
    dispatchProfileOffersRefresh({ deletedOfferId: 0 });
    window.removeEventListener(PROFILE_OFFERS_REFRESH_EVENT, spy);
    expect(spy).not.toHaveBeenCalled();
  });

  it('ownerUserId a deletedOfferId sú oba prítomné v payloade', async () => {
    const eventPromise = captureNextEvent();
    dispatchProfileOffersRefresh({ ownerUserId: 7, deletedOfferId: 55 });
    const event = await eventPromise;
    const payload = readProfileOffersRefreshEvent(event);
    expect(payload?.ownerUserId).toBe(7);
    expect(payload?.deletedOfferId).toBe(55);
  });
});
