import { getOffersFromCache, makeOffersCacheKey, setOffersToCache } from '../profileOffersCache';
import { PROFILE_OFFERS_REFRESH_EVENT, readProfileOffersRefreshEvent } from '../profileOfferEvents';
import { removeOfferPhotoAndRefreshProfile, scheduleProfileOffersRefresh } from '../profileOffersRefresh';
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

describe('removeOfferPhotoAndRefreshProfile', () => {
  // Falošné časovače počítajú časovač s oneskorením 0 počas posunu času ako 1 ms, preto
  // sa po konci zmazania čaká o chvíľu dlhšie než samotné zlúčenie.
  const SETTLE_MS = COALESCE_MS + 3;

  let received: Received[];

  const listener = (event: Event) => {
    received.push(readProfileOffersRefreshEvent(event) ?? {});
  };

  const succeedsAfter = (ms: number, value: unknown = []) =>
    new Promise((resolve) => setTimeout(() => resolve(value), ms));
  const failsAfter = (ms: number) =>
    new Promise((_resolve, reject) => setTimeout(() => reject(new Error('zlyhalo')), ms));

  /** Tak, ako fotky maže okno úpravy ponuky: po jednej, každá sa dokončí skôr, než sa začne ďalšia. */
  async function removeOneByOne(ownerUserId: number | undefined, removals: Array<() => Promise<unknown>>) {
    for (const removal of removals) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await removeOfferPhotoAndRefreshProfile(ownerUserId, removal);
      } catch {
        // chybu hlási samotné zmazanie
      }
    }
  }

  beforeEach(() => {
    jest.useFakeTimers();
    received = [];
    window.addEventListener(PROFILE_OFFERS_REFRESH_EVENT, listener);
  });

  afterEach(async () => {
    await jest.runOnlyPendingTimersAsync();
    window.removeEventListener(PROFILE_OFFERS_REFRESH_EVENT, listener);
    jest.useRealTimers();
  });

  it('vráti výsledok zmazania', async () => {
    const images = [{ id: 2 }];

    const result = removeOfferPhotoAndRefreshProfile(5, () => succeedsAfter(10, images));
    await jest.advanceTimersByTimeAsync(10);

    await expect(result).resolves.toBe(images);
  });

  it('po jednom zmazaní pošle obnovenie raz, až po dokončení', async () => {
    void removeOfferPhotoAndRefreshProfile(5, () => succeedsAfter(450));

    await jest.advanceTimersByTimeAsync(450 + COALESCE_MS - 1);
    expect(received).toEqual([]);

    await jest.advanceTimersByTimeAsync(SETTLE_MS - COALESCE_MS + 1);
    expect(received).toEqual([{ ownerUserId: 5 }]);
  });

  it('zneplatní cache ponúk až po dokončení zmazania', async () => {
    const key = makeOffersCacheKey(5);
    setOffersToCache(key, [{ id: 1 } as Offer]);

    void removeOfferPhotoAndRefreshProfile(5, () => succeedsAfter(450));
    await jest.advanceTimersByTimeAsync(449);
    expect(getOffersFromCache(key)).toHaveLength(1);

    await jest.advanceTimersByTimeAsync(1 + SETTLE_MS);
    expect(getOffersFromCache(key)).toBeUndefined();
  });

  it('pri sérii pomalých zmazaní za sebou pošle jedno obnovenie až po poslednom', async () => {
    const done = removeOneByOne(5, [() => succeedsAfter(450), () => succeedsAfter(450), () => succeedsAfter(450)]);

    // Počas celej série (3 x 450 ms) neodíde nič, hoci každé zmazanie trvá dlhšie než zlúčenie.
    await jest.advanceTimersByTimeAsync(3 * 450 + COALESCE_MS - 1);
    expect(received).toEqual([]);

    await jest.advanceTimersByTimeAsync(SETTLE_MS - COALESCE_MS + 1);
    await done;
    expect(received).toEqual([{ ownerUserId: 5 }]);
  });

  it('paralelné zmazania pošlú jedno obnovenie po poslednom', async () => {
    const done = Promise.all([
      removeOfferPhotoAndRefreshProfile(5, () => succeedsAfter(100)),
      removeOfferPhotoAndRefreshProfile(5, () => succeedsAfter(700)),
    ]);

    await jest.advanceTimersByTimeAsync(700 + COALESCE_MS - 1);
    expect(received).toEqual([]);

    await jest.advanceTimersByTimeAsync(SETTLE_MS - COALESCE_MS + 1);
    await done;
    expect(received).toEqual([{ ownerUserId: 5 }]);
  });

  it('chybu zmazania prepošle a keď zlyhajú všetky, obnovenie neodíde (ani pri prvom použití pre vlastníka)', async () => {
    // Vlastník 8 sa v tomto súbore inde nepoužíva, takže séria začína od východiskového stavu.
    const failing = removeOfferPhotoAndRefreshProfile(8, () => failsAfter(10));
    const rejected = expect(failing).rejects.toThrow('zlyhalo');
    await jest.advanceTimersByTimeAsync(10);
    await rejected;

    await jest.advanceTimersByTimeAsync(COALESCE_MS * 2);
    expect(received).toEqual([]);
  });

  it('keď zlyhá posledné zmazanie série, obnovenie odíde až po ňom', async () => {
    const done = removeOneByOne(5, [() => succeedsAfter(10), () => failsAfter(450)]);

    await jest.advanceTimersByTimeAsync(10 + 450 + COALESCE_MS - 1);
    expect(received).toEqual([]);

    await jest.advanceTimersByTimeAsync(SETTLE_MS - COALESCE_MS + 1);
    await done;
    expect(received).toEqual([{ ownerUserId: 5 }]);
  });

  it('keď zlyhá prvé zmazanie série a druhé prejde, obnovenie odíde raz po druhom', async () => {
    const done = removeOneByOne(5, [() => failsAfter(450), () => succeedsAfter(10)]);

    await jest.advanceTimersByTimeAsync(450 + 10 + COALESCE_MS - 1);
    expect(received).toEqual([]);

    await jest.advanceTimersByTimeAsync(SETTLE_MS - COALESCE_MS + 1);
    await done;
    expect(received).toEqual([{ ownerUserId: 5 }]);
  });

  it('séria, v ktorej zlyhajú všetky zmazania, po predošlej úspešnej sérii obnovenie neposiela', async () => {
    await Promise.all([removeOneByOne(5, [() => succeedsAfter(10)]), jest.advanceTimersByTimeAsync(10 + SETTLE_MS)]);
    expect(received).toEqual([{ ownerUserId: 5 }]);

    await Promise.all([removeOneByOne(5, [() => failsAfter(10), () => failsAfter(10)]), jest.advanceTimersByTimeAsync(20 + SETTLE_MS)]);
    expect(received).toEqual([{ ownerUserId: 5 }]);
  });

  it('každá samostatná séria dostane vlastné obnovenie', async () => {
    await Promise.all([removeOneByOne(5, [() => succeedsAfter(10)]), jest.advanceTimersByTimeAsync(10 + SETTLE_MS)]);
    expect(received).toEqual([{ ownerUserId: 5 }]);

    await Promise.all([removeOneByOne(5, [() => succeedsAfter(10)]), jest.advanceTimersByTimeAsync(10 + SETTLE_MS)]);
    expect(received).toEqual([{ ownerUserId: 5 }, { ownerUserId: 5 }]);
  });

  it('série rôznych vlastníkov sú nezávislé', async () => {
    const done = Promise.all([
      removeOneByOne(5, [() => succeedsAfter(10)]),
      removeOneByOne(6, [() => succeedsAfter(900)]),
    ]);

    await jest.advanceTimersByTimeAsync(10 + SETTLE_MS);
    expect(received).toEqual([{ ownerUserId: 5 }]);

    await jest.advanceTimersByTimeAsync(900 + SETTLE_MS);
    await done;
    expect(received).toEqual([{ ownerUserId: 5 }, { ownerUserId: 6 }]);
  });

  it('bez vlastníka obnoví vlastný zoznam (udalosť bez ownerUserId)', async () => {
    void removeOfferPhotoAndRefreshProfile(undefined, () => succeedsAfter(10));

    await jest.advanceTimersByTimeAsync(10 + SETTLE_MS);
    expect(received).toEqual([{}]);
  });
});
