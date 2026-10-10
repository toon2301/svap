import { getOffersFromCache, makeOffersCacheKey, setOffersToCache } from '../profileOffersCache';
import { PROFILE_OFFERS_REFRESH_EVENT, readProfileOffersRefreshEvent } from '../profileOfferEvents';
import { scheduleProfileOffersRefresh } from '../profileOffersRefresh';
import type { Offer } from '../profileOffersTypes';

const COALESCE_MS = 300;

type Received = { ownerUserId?: number; offerId?: number; deletedOfferId?: number };

describe('scheduleProfileOffersRefresh', () => {
  let received: Received[];

  const listener = (event: Event) => {
    received.push(readProfileOffersRefreshEvent(event) ?? {});
  };

  beforeEach(() => {
    jest.useFakeTimers();
    received = [];
    window.addEventListener(PROFILE_OFFERS_REFRESH_EVENT, listener);
  });

  afterEach(() => {
    // Dobehni prípadné čakajúce časovače, aby sa nepreniesli do ďalšieho testu.
    jest.runOnlyPendingTimers();
    window.removeEventListener(PROFILE_OFFERS_REFRESH_EVENT, listener);
    jest.useRealTimers();
  });

  it('hneď zneplatní cache ponúk daného vlastníka', () => {
    const key = makeOffersCacheKey(5);
    setOffersToCache(key, [{ id: 1 } as Offer]);

    scheduleProfileOffersRefresh(5);

    expect(getOffersFromCache(key)).toBeUndefined();
  });

  it('nezneplatní cache iného vlastníka', () => {
    const otherKey = makeOffersCacheKey(6);
    setOffersToCache(otherKey, [{ id: 2 } as Offer]);

    scheduleProfileOffersRefresh(5);

    expect(getOffersFromCache(otherKey)).toHaveLength(1);
  });

  it('udalosť obnovenia pošle až po krátkom zlúčení, nie okamžite', () => {
    scheduleProfileOffersRefresh(5);
    expect(received).toEqual([]);

    jest.advanceTimersByTime(COALESCE_MS - 1);
    expect(received).toEqual([]);

    jest.advanceTimersByTime(1);
    expect(received).toEqual([{ ownerUserId: 5 }]);
  });

  it('viac žiadostí za sebou zlúči do jednej udalosti', () => {
    scheduleProfileOffersRefresh(5);
    jest.advanceTimersByTime(COALESCE_MS - 50);
    scheduleProfileOffersRefresh(5);
    jest.advanceTimersByTime(COALESCE_MS - 50);
    scheduleProfileOffersRefresh(5);

    jest.advanceTimersByTime(COALESCE_MS);

    expect(received).toEqual([{ ownerUserId: 5 }]);
  });

  it('každá nová žiadosť predĺži čakanie od svojho okamihu', () => {
    scheduleProfileOffersRefresh(5);
    jest.advanceTimersByTime(COALESCE_MS - 50);
    scheduleProfileOffersRefresh(5);

    jest.advanceTimersByTime(COALESCE_MS - 1);
    expect(received).toEqual([]);

    jest.advanceTimersByTime(1);
    expect(received).toEqual([{ ownerUserId: 5 }]);
  });

  it('žiadosti pre rôznych vlastníkov sa nezlučujú', () => {
    scheduleProfileOffersRefresh(5);
    scheduleProfileOffersRefresh(6);

    jest.advanceTimersByTime(COALESCE_MS);

    expect(received.map((item) => item.ownerUserId).sort()).toEqual([5, 6]);
  });

  it('po odoslaní udalosti sa ďalšia žiadosť odošle znova', () => {
    scheduleProfileOffersRefresh(5);
    jest.advanceTimersByTime(COALESCE_MS);
    scheduleProfileOffersRefresh(5);
    jest.advanceTimersByTime(COALESCE_MS);

    expect(received).toEqual([{ ownerUserId: 5 }, { ownerUserId: 5 }]);
  });

  it('bez vlastníka pošle udalosť bez ownerUserId a zneplatní vlastnú cache', () => {
    const selfKey = makeOffersCacheKey(undefined);
    setOffersToCache(selfKey, [{ id: 3 } as Offer]);

    scheduleProfileOffersRefresh();
    expect(getOffersFromCache(selfKey)).toBeUndefined();

    jest.advanceTimersByTime(COALESCE_MS);
    expect(received).toEqual([{}]);
  });
});
