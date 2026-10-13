/**
 * Pôvod stránky recenzií a šípka späť.
 *
 * Keď recenzie otvorí appka (karta ponuky na profile), šípka má spraviť SKUTOČNÝ
 * krok späť. Pôvodné `router.push` na profil pridávalo ďalší záznam, takže
 * prehliadačové Späť viedlo zasa do recenzií (slučka profil ↔ recenzie). Bez
 * pôvodu (odkaz, F5) ostáva záložná adresa.
 *
 * Mechanika histórie je skutočná (jsdom); Next router je nahradený tým, čo robí
 * pri klientskej navigácii – push pridá záznam.
 */

import { act, waitFor } from '@testing-library/react';
import {
  adoptOfferReviewsOrigin,
  markOfferReviewsPending,
  openOfferReviews,
  resetOfferReviewsOrigin,
  returnToOfferReviewsOrigin,
} from './offerReviewsOrigin';
import { buildOfferReviewsPath, buildOfferReviewsReturnTo } from './offerReviewsRouting';
import { readRememberedProfileScroll } from '../profile/profileScrollMemory';

const SEARCH = '/dashboard/search';
const PROFILE = '/dashboard/users/peter?tab=offers';
const REVIEWS_PATH = '/dashboard/offers/7/reviews';
const REVIEWS = buildOfferReviewsPath(7, {
  returnTo: buildOfferReviewsReturnTo({ offerId: 7, ownerIdentifier: 'peter', isOwnProfile: false }),
})!;

function historyRouter() {
  return { push: (url: string) => window.history.pushState(null, '', url) };
}

const url = () => window.location.pathname + window.location.search;

/** Počká na `popstate` – jediný signál, že sa história naozaj pohla. */
async function waitForPopState(trigger: () => void): Promise<void> {
  let popped = false;
  const onPopState = () => {
    popped = true;
  };
  window.addEventListener('popstate', onPopState);
  try {
    await act(async () => {
      trigger();
    });
    await waitFor(() => expect(popped).toBe(true));
  } finally {
    window.removeEventListener('popstate', onPopState);
  }
}

async function goBack(): Promise<void> {
  await waitForPopState(() => window.history.back());
}

/** Šípka v recenziách: pri známom pôvode krok späť, inak (tu) nič. */
async function arrow(): Promise<boolean> {
  let steppedBack = false;
  await waitForPopState(() => {
    steppedBack = returnToOfferReviewsOrigin();
    // Bez pôvodu sa história nehýbe – pošli `popstate`, nech sa čakanie ukončí.
    if (!steppedBack) window.dispatchEvent(new PopStateEvent('popstate'));
  });
  return steppedBack;
}

beforeEach(() => {
  resetOfferReviewsOrigin();
  window.history.replaceState(null, '', '/dashboard');
});

describe('scenár z mapovania: Vyhľadávanie → cudzí profil → recenzie', () => {
  it('returns with one step to the profile and then to search', async () => {
    const router = historyRouter();
    router.push(SEARCH);
    router.push(PROFILE);

    openOfferReviews(router, REVIEWS);
    expect(url()).toBe(REVIEWS);
    adoptOfferReviewsOrigin();

    expect(await arrow()).toBe(true);
    // Šípka: jeden krok – presne na záznam, z ktorého sa recenzie otvorili.
    expect(url()).toBe(PROFILE);

    // Ďalší krok už vedie preč z profilu. Predtým (`push` na profil) sa tu
    // objavili znova recenzie a z dvojice záznamov sa nedalo vyjsť.
    await goBack();
    expect(url()).toBe(SEARCH);
  });
});

describe('otvorenie recenzií', () => {
  it('pushes the address exactly once', () => {
    const push = jest.fn();

    openOfferReviews({ push }, REVIEWS);

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(REVIEWS);
  });

  it('remembers the open that a plain link makes, without navigating itself', () => {
    const router = historyRouter();
    router.push(PROFILE);
    const lengthAtProfile = window.history.length;

    // Odkaz (`<Link>`) navigáciu robí sám, appka mu len povie, čo sa otvára.
    markOfferReviewsPending(REVIEWS);
    expect(url()).toBe(PROFILE);
    expect(window.history.length).toBe(lengthAtProfile);

    router.push(REVIEWS);
    adoptOfferReviewsOrigin();

    expect(returnToOfferReviewsOrigin()).toBe(true);
  });

  it('adopts by the path only, whatever the query or the hash look like', () => {
    markOfferReviewsPending(`${REVIEWS_PATH}?returnTo=%2Fdashboard%2Fusers%2Fpeter#x`);

    window.history.pushState(null, '', `${REVIEWS_PATH}?review_id=4`);
    adoptOfferReviewsOrigin();

    expect(returnToOfferReviewsOrigin()).toBe(true);
  });
});

describe('stránka otvorená inak ako z appky', () => {
  it('has no origin for a direct link', async () => {
    window.history.replaceState(null, '', REVIEWS);
    adoptOfferReviewsOrigin();
    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => {});

    try {
      expect(await arrow()).toBe(false);
      expect(backSpy).not.toHaveBeenCalled();
    } finally {
      backSpy.mockRestore();
    }
  });

  it('does not let a forgotten open claim a later direct link', async () => {
    const router = historyRouter();
    router.push(PROFILE);
    // Otvorenie, ktoré nikam nedobehlo – recenzie sa nezobrazili.
    openOfferReviews({ push: () => {} }, REVIEWS);
    adoptOfferReviewsOrigin();

    // Neskôr sa na tie isté recenzie príde odkazom.
    window.history.replaceState(null, '', REVIEWS);
    adoptOfferReviewsOrigin();

    expect(await arrow()).toBe(false);
  });

  it('forgets a pending open when the state is reset (tests start clean)', async () => {
    const router = historyRouter();
    router.push(PROFILE);
    markOfferReviewsPending(REVIEWS);

    resetOfferReviewsOrigin();
    router.push(REVIEWS);
    adoptOfferReviewsOrigin();

    expect(await arrow()).toBe(false);
  });

  it('is one-shot: the same address reached again without a new open has no origin', async () => {
    const router = historyRouter();
    router.push(PROFILE);
    openOfferReviews(router, REVIEWS);
    adoptOfferReviewsOrigin();

    // Neskôr sa na tie isté recenzie príde znova (napr. z notifikácie): nové
    // otvorenie z karty tu nebolo, takže tento záznam pôvod nenesie.
    router.push(PROFILE);
    router.push(REVIEWS);
    adoptOfferReviewsOrigin();

    expect(await arrow()).toBe(false);
  });
});

describe('po F5 (obnovenie stránky)', () => {
  /** Kľúč v `history.state`, do ktorého sa značka píše. */
  const ORIGIN_KEY = '__svaplyOfferReviewsOrigin';

  it('keeps the origin: a reload does not change the history, so the previous record is still the profile', async () => {
    const router = historyRouter();
    router.push(SEARCH);
    router.push(PROFILE);
    openOfferReviews(router, REVIEWS);
    adoptOfferReviewsOrigin();

    // Reload: `history` aj `history.state` prežijú, modulový stav nie – po F5 beží čerstvá kópia modulu.
    let freshReturn: typeof returnToOfferReviewsOrigin = () => false;
    jest.isolateModules(() => {
      freshReturn = jest.requireActual('./offerReviewsOrigin').returnToOfferReviewsOrigin;
    });
    let steppedBack = false;
    await waitForPopState(() => {
      steppedBack = freshReturn();
    });

    expect(steppedBack).toBe(true);
    // Presne na existujúci záznam profilu – nie jeho kópia navyše (tá by zachytila ďalšie Späť).
    expect(url()).toBe(PROFILE);
    await goBack();
    expect(url()).toBe(SEARCH);
  });

  it('accepts a marker written by an older build that tied it to the page load', () => {
    window.history.replaceState({ [ORIGIN_KEY]: { version: 1, pageLoadId: 'pred-F5' } }, '', REVIEWS);
    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => {});

    try {
      expect(returnToOfferReviewsOrigin()).toBe(true);
      expect(backSpy).toHaveBeenCalledTimes(1);
    } finally {
      backSpy.mockRestore();
    }
  });

  it.each([
    ['iná verzia', { version: 2 }],
    ['verzia ako text', { version: '1' }],
    ['prázdny objekt', {}],
    ['text', 'yes'],
    ['číslo', 1],
    ['null', null],
  ] as Array<[string, unknown]>)('refuses a damaged marker (%s)', (_title, marker) => {
    window.history.replaceState({ [ORIGIN_KEY]: marker }, '', REVIEWS);
    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => {});

    try {
      expect(returnToOfferReviewsOrigin()).toBe(false);
      expect(backSpy).not.toHaveBeenCalled();
    } finally {
      backSpy.mockRestore();
    }
  });
});

describe('záznam histórie', () => {
  it('keeps what the router and other parts of the app wrote into the same record', () => {
    window.history.replaceState({ __NA: true, tree: [1, 2] }, '', REVIEWS);
    markOfferReviewsPending(REVIEWS);

    adoptOfferReviewsOrigin();

    expect(window.history.state).toMatchObject({ __NA: true, tree: [1, 2] });
    expect(returnToOfferReviewsOrigin()).toBe(true);
  });

  it('belongs to the record it was written to', async () => {
    const router = historyRouter();
    router.push(PROFILE);
    openOfferReviews(router, REVIEWS);
    adoptOfferReviewsOrigin();

    // Iný záznam (aj na tej istej adrese) značku nenesie.
    router.push(REVIEWS);

    expect(await arrow()).toBe(false);
  });

  it('survives going back and forward again', async () => {
    const router = historyRouter();
    router.push(PROFILE);
    openOfferReviews(router, REVIEWS);
    adoptOfferReviewsOrigin();

    await goBack();
    expect(url()).toBe(PROFILE);
    await waitForPopState(() => window.history.forward());
    expect(url()).toBe(REVIEWS);

    expect(await arrow()).toBe(true);
    expect(url()).toBe(PROFILE);
  });
});

describe('pozícia profilu pre návrat z recenzií', () => {
  function mountMain(scrollTop: number): HTMLElement {
    const main = document.createElement('main');
    main.setAttribute('data-dashboard-main', '');
    main.scrollTop = scrollTop;
    document.body.appendChild(main);
    return main;
  }

  afterEach(() => {
    document.querySelectorAll('[data-dashboard-main]').forEach((node) => node.remove());
  });

  it('saves the scroll of the profile before the navigation starts', () => {
    const router = historyRouter();
    router.push(PROFILE);
    mountMain(2262);
    const seenAtPush: Array<number | null> = [];

    openOfferReviews(
      {
        push: (target) => {
          seenAtPush.push(readRememberedProfileScroll());
          router.push(target);
        },
      },
      REVIEWS,
    );

    // Pozícia musí byť zapísaná skôr, než router pridá nový záznam – inak by pristála v ňom.
    expect(seenAtPush).toEqual([2262]);
  });

  it('saves the scroll for a plain link as well', () => {
    const router = historyRouter();
    router.push(PROFILE);
    mountMain(1500);

    markOfferReviewsPending(REVIEWS);

    expect(readRememberedProfileScroll()).toBe(1500);
  });

  it('writes it into the profile record: the reviews record carries none, going back finds it', async () => {
    const router = historyRouter();
    router.push(SEARCH);
    router.push(PROFILE);
    mountMain(2262);
    openOfferReviews(router, REVIEWS);
    adoptOfferReviewsOrigin();

    expect(readRememberedProfileScroll()).toBeNull();
    expect(await arrow()).toBe(true);

    expect(url()).toBe(PROFILE);
    expect(readRememberedProfileScroll()).toBe(2262);
  });

  it('keeps the origin marker working next to it', async () => {
    const router = historyRouter();
    router.push(PROFILE);
    mountMain(2262);

    openOfferReviews(router, REVIEWS);
    adoptOfferReviewsOrigin();

    expect(await arrow()).toBe(true);
    expect(url()).toBe(PROFILE);
  });

  it('saves nothing when the profile is at the top', () => {
    const router = historyRouter();
    router.push(PROFILE);
    mountMain(0);

    openOfferReviews(router, REVIEWS);

    expect(window.history.state).toBeNull();
  });

  it('opens the reviews even when there is no scrollable area to remember', () => {
    const push = jest.fn();

    openOfferReviews({ push }, REVIEWS);

    expect(push).toHaveBeenCalledWith(REVIEWS);
  });
});
