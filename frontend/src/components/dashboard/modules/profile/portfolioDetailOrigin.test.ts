/**
 * Pôvod detailu portfólia a mobilná šípka späť.
 *
 * Keď položku otvorí appka (záložka Portfólio, zdieľaná karta na Nástenke),
 * šípka má spraviť SKUTOČNÝ krok späť. Pôvodný `replace` prepisoval záznam
 * položky inou adresou toho istého stavu a v histórii ostali dva rovnaké
 * kroky na profile. Bez pôvodu (odkaz, F5) ostáva `replace` na zoznam.
 *
 * Mechanika histórie je skutočná (jsdom); Next router je nahradený tým, čo
 * robí pri klientskej navigácii – push pridá záznam, replace ho prepíše.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import {
  adoptPortfolioDetailOrigin,
  buildPortfolioDetailPath,
  buildPortfolioListPath,
  navigateBackFromPortfolioDetail,
  openPortfolioDetail,
  portfolioDetailBackTarget,
  resetPortfolioDetailOrigin,
  returnToPortfolioDetailOrigin,
} from './portfolioRouting';
import { useProfileTabQuery } from './profileTabQuery';
import { buildSharedSourceHandler } from '../feed/feedSharedContentNavigation';

const SEARCH = '/dashboard/search';
const PROFILE = '/dashboard/users/peter';
const LIST = buildPortfolioListPath('peter');
const ITEM = buildPortfolioDetailPath('peter', 5);

function historyRouter() {
  return {
    push: (url: string) => window.history.pushState(null, '', url),
    replace: (url: string) => window.history.replaceState(null, '', url),
  };
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

/**
 * Mobilná šípka v detaile – rozhodovanie z `handlePortfolioDetailBack`
 * v `DashboardContent`: pri známom pôvode krok späť, inak `replace`.
 */
async function mobileArrow(router: ReturnType<typeof historyRouter>, owner: string) {
  let steppedBack = false;
  await waitForPopState(() => {
    steppedBack = returnToPortfolioDetailOrigin();
    if (!steppedBack) {
      navigateBackFromPortfolioDetail(router, portfolioDetailBackTarget(owner).target);
      // `replace` nevyvolá popstate – pošli ho, nech sa čakanie ukončí.
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });
  return steppedBack;
}

beforeEach(() => {
  resetPortfolioDetailOrigin();
});

describe('scenár z mapovania: Nástenka → Vyhľadávanie → cudzí profil → Portfólio', () => {
  it('returns with one step to the profile and then to search', async () => {
    const router = historyRouter();
    window.history.replaceState(null, '', '/dashboard');
    router.push(SEARCH);
    router.push(PROFILE);

    // Záložka Portfólio – používateľova navigácia, teda push (Testy 17-18).
    const tabs = renderHook(() => useProfileTabQuery('offers', 42));
    act(() => tabs.result.current[1]('portfolio'));
    expect(url()).toBe(`${PROFILE}?tab=portfolio`);
    tabs.unmount();

    // Klik na položku a jej zobrazenie.
    openPortfolioDetail(router, 'peter', 5);
    expect(url()).toBe(ITEM);
    adoptPortfolioDetailOrigin();

    expect(await mobileArrow(router, 'peter')).toBe(true);
    // Šípka: jeden krok – presne na záznam, z ktorého sa položka otvorila.
    expect(url()).toBe(`${PROFILE}?tab=portfolio`);

    // Ďalej už len vlastné kroky používateľa: záložka Ponuky, Vyhľadávanie.
    // Žiadna kópia profilu navyše (predtým `/portfolio` + `?tab=portfolio`).
    //
    // Vstupný záznam nesie záložku explicitne – bez nej by krok späť na holú
    // adresu dosadil poslednú voľbu namiesto tej, ktorú záznam niesol.
    await goBack();
    expect(url()).toBe(`${PROFILE}?tab=offers`);
    await goBack();
    expect(url()).toBe(SEARCH);
  });
});

describe('ďalšie vstupné cesty', () => {
  it('steps back to the feed from a shared portfolio card', async () => {
    const router = historyRouter();
    window.history.replaceState(null, '', '/dashboard');
    const openSource = buildSharedSourceHandler(
      {
        id: 1,
        post_type: 'shared_portfolio_item',
        shared_content: { type: 'portfolio_item', id: 5, owner: { id: 42, slug: 'peter' } },
      } as never,
      { router },
    );

    openSource?.();
    expect(url()).toBe(ITEM);
    adoptPortfolioDetailOrigin();

    expect(await mobileArrow(router, 'peter')).toBe(true);
    expect(url()).toBe('/dashboard');
  });

  it('keeps the replace fallback for a direct link', async () => {
    const router = historyRouter();
    // Odkaz: adresa položky je prvé, čo appka videla – nikto ju neotvoril.
    window.history.replaceState(null, '', ITEM);
    const lengthAtItem = window.history.length;
    adoptPortfolioDetailOrigin();

    expect(await mobileArrow(router, 'peter')).toBe(false);
    expect(url()).toBe(LIST);
    expect(window.history.length).toBe(lengthAtItem);
  });

  it('keeps the replace fallback after F5', async () => {
    const router = historyRouter();
    window.history.replaceState(null, '', PROFILE);
    openPortfolioDetail(router, 'peter', 5);
    adoptPortfolioDetailOrigin();

    // Reload: `history.state` prežije, modulový stav nie – nové načítanie
    // stránky pôvod nepozná.
    let freshReturn: typeof returnToPortfolioDetailOrigin = () => true;
    jest.isolateModules(() => {
      freshReturn = jest.requireActual('./portfolioRouting').returnToPortfolioDetailOrigin;
    });
    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => {});
    try {
      expect(freshReturn()).toBe(false);
      expect(backSpy).not.toHaveBeenCalled();
      // Kontrola: to isté načítanie stránky ten istý marker uzná – nové
      // načítanie teda odmietlo pôvod, nie poškodený záznam.
      expect(returnToPortfolioDetailOrigin()).toBe(true);
      expect(backSpy).toHaveBeenCalledTimes(1);
    } finally {
      backSpy.mockRestore();
    }
  });

  it('does not let a forgotten open claim a later direct link', async () => {
    const router = historyRouter();
    window.history.replaceState(null, '', PROFILE);
    // Otvorenie, ktoré nikam nedobehlo – detail sa nezobrazil.
    openPortfolioDetail({ push: () => {} }, 'peter', 5);
    adoptPortfolioDetailOrigin();

    // Neskôr sa na tú istú položku príde odkazom.
    window.history.replaceState(null, '', ITEM);
    adoptPortfolioDetailOrigin();

    expect(await mobileArrow(router, 'peter')).toBe(false);
    expect(url()).toBe(LIST);
  });
});
