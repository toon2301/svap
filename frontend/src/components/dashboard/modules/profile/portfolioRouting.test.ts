/**
 * Návrat z detailu portfólia – a hlavne to, že sa z neho nedá spraviť slučka.
 *
 * Pôvodné správanie (`router.push`) pridávalo pri každom appkovom „späť" nový
 * záznam histórie, takže prehliadačové Back viedlo naspäť na položku a celé sa
 * to točilo dokola. Test drží mechaniku histórie, nie len tvar adresy.
 */

import { waitFor } from '@testing-library/react';
import {
  buildPortfolioDetailPath,
  buildPortfolioListPath,
  getPortfolioOwnerIdentifier,
  navigateBackFromPortfolioDetail,
  portfolioDetailBackTarget,
} from './portfolioRouting';

const LIST = buildPortfolioListPath('peter');
const ITEM = buildPortfolioDetailPath('peter', 5);

/**
 * Router nad SKUTOČNOU históriou jsdom.
 *
 * Presne to, čo robí Next router pri klientskej navigácii – vďaka tomu sa dá
 * merať, koľko záznamov pribudlo, nie len kam ukazuje adresa.
 */
function historyRouter() {
  return {
    push: (url: string) => window.history.pushState(null, '', url),
    replace: (url: string) => window.history.replaceState(null, '', url),
  };
}

/**
 * Krok späť, ktorý sa naozaj stal.
 *
 * jsdom vybavuje `back()` asynchrónne a adresa sa pritom meniť nemusí (dva
 * susedné záznamy vedia ukazovať na to isté), takže sa čaká na `popstate` –
 * jediný signál, že sa história naozaj pohla. `waitFor` to zároveň ohraničí:
 * keby krok späť nebolo kam spraviť, test padne namiesto tichého prejdenia.
 */
async function goBack(): Promise<void> {
  let popped = false;
  const onPopState = () => {
    popped = true;
  };
  window.addEventListener('popstate', onPopState);
  window.history.back();
  try {
    await waitFor(() => expect(popped).toBe(true));
  } finally {
    window.removeEventListener('popstate', onPopState);
  }
}

beforeEach(() => {
  window.history.replaceState(null, '', LIST);
});

describe('cieľ návratu z detailu portfólia', () => {
  it('points at the owner portfolio list', () => {
    expect(portfolioDetailBackTarget('peter')).toEqual({
      target: LIST,
      module: 'user-profile',
    });
  });

  it('falls back to the own profile when there is no owner', () => {
    // Bez vlastníka niet zoznamu, na ktorý by sa dalo vrátiť.
    expect(portfolioDetailBackTarget(null)).toEqual({
      target: '/dashboard/profile',
      module: 'profile',
    });
    expect(portfolioDetailBackTarget('   ')).toEqual({
      target: '/dashboard/profile',
      module: 'profile',
    });
  });
});

describe('slučka pri tlačidle späť', () => {
  it('adds no history entry when going back from the item', () => {
    const router = historyRouter();

    router.push(ITEM);
    const lengthAtItem = window.history.length;

    navigateBackFromPortfolioDetail(router, portfolioDetailBackTarget('peter').target);

    expect(window.location.pathname).toBe(LIST);
    // Práve tu vznikala slučka: `push` by histórii pridal ďalší záznam.
    expect(window.history.length).toBe(lengthAtItem);
  });

  it('never returns to the item on repeated browser Back', async () => {
    const router = historyRouter();

    // profil → položka
    router.push(ITEM);
    expect(window.location.pathname).toBe(ITEM);

    // appkové „späť"
    navigateBackFromPortfolioDetail(router, portfolioDetailBackTarget('peter').target);
    expect(window.location.pathname).toBe(LIST);

    // prehliadačové Back dvakrát – položka sa nesmie vrátiť ani raz.
    for (let step = 0; step < 2; step += 1) {
      await goBack();
      expect(window.location.pathname).not.toBe(ITEM);
    }
  });

  it('does not pile up duplicate list entries when the round trip repeats', () => {
    const router = historyRouter();
    const { target } = portfolioDetailBackTarget('peter');

    // Jedno pushnutie na ustálenie: jsdom má jednu históriu na celý súbor a
    // predošlý test ju nechal uprostred zásobníka. `push` zahadzuje záznamy
    // pred sebou, takže bez tohto by prvé kolo dĺžku zmenšilo, nie zväčšilo.
    router.push(LIST);

    // Tri kolá „otvor položku a vráť sa". Meria sa PRÍRASTOK v každom kole,
    // nie absolútna dĺžka.
    for (let round = 0; round < 3; round += 1) {
      const beforeOpen = window.history.length;
      router.push(ITEM);
      const afterOpen = window.history.length;
      navigateBackFromPortfolioDetail(router, target);
      const afterBack = window.history.length;

      // Otvorenie položky je krok…
      expect(afterOpen).toBe(beforeOpen + 1);
      // …návrat z nej NIE. Presne tým vznikala slučka.
      expect(afterBack).toBe(afterOpen);
      expect(window.location.pathname).toBe(LIST);
    }
  });
});

describe('portfolioRouting', () => {
  it('uses a trimmed slug before numeric ids', () => {
    expect(getPortfolioOwnerIdentifier(42, ' jane-doe ')).toBe('jane-doe');
  });

  it('only accepts positive whole numeric owner ids', () => {
    expect(getPortfolioOwnerIdentifier(42, null)).toBe('42');
    expect(getPortfolioOwnerIdentifier(0, null)).toBeNull();
    expect(getPortfolioOwnerIdentifier(-1, null)).toBeNull();
    expect(getPortfolioOwnerIdentifier(1.5, null)).toBeNull();
  });

  it('builds canonical portfolio paths', () => {
    expect(buildPortfolioListPath('jane-doe')).toBe('/dashboard/users/jane-doe/portfolio');
    expect(buildPortfolioDetailPath('jane-doe', 7)).toBe('/dashboard/users/jane-doe/portfolio/7');
  });
});
