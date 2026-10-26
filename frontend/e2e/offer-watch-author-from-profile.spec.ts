import { expect, test, type Page } from '@playwright/test';

import { MAIN, pathOf, sideNav } from './support/dashboard';
import { RESULTS_PANEL } from './support/offer-watch-results';

// Sledovania → hlavička autora karty zhody (nález 171). Klik musí otvoriť profil, aj keď Dashboard
// stojí na Next stránke profilu toho istého autora (otvorený profil → ľavé menu Sledovania → karta
// toho autora): dovtedy sa zmenila len adresa a obrazovka ostala na Sledovaniach. Test iba číta
// a klika na hlavičku karty, nič nezapisuje (každá požiadavka okrem čítania sa preruší a test na ňu
// zlyhá). Dôsledok na produkcii: otvorenie cudzieho profilu zapíše 1 návštevu profilu na účet a deň.
// Autora a ponuku si vezme z výsledkov sledovania, ktoré aplikácia ukáže po kliku na ľavé menu;
// bez živých výsledkov s autorom, ktorý má adresu (slug), sa preskočí. Karty zhôd sú len na PC.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

let attemptedWrites: string[] = [];

test.beforeEach(async ({ page }) => {
  attemptedWrites = [];
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request();
      const sessionRefresh = ['/api/token/refresh/', '/api/auth/token/refresh/'].includes(
        new URL(request.url()).pathname,
      );
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || sessionRefresh) {
        await route.continue();
      } else {
        attemptedWrites.push(`${request.method()} ${new URL(request.url()).pathname}`);
        await route.abort();
      }
    },
  );
});

test.afterEach(() => {
  expect(attemptedWrites, 'Test Sledovaní nesmie nič zapisovať').toEqual([]);
});

// Service worker aplikácie (public/sw.js) preposiela každé volanie /api/ cez vlastný fetch. Také požiadavky
// `page.route` nevidí, takže by strážca zápisov (a simulovaná odpoveď) mlčky nefungoval. Preto sa worker
// v tomto špecu blokuje.
test.use({ serviceWorkers: 'block' });

type Match = { index: number; offerId: number; slug: string };

/** Ľavé menu Sledovania; vráti ID sledovania, ktoré aplikácia otvorila (parameter `watch`). */
async function openWatchesFromMenu(page: Page): Promise<number> {
  await sideNav(page, 'Sledovania').click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('watch'), { message: 'Sledovania neotvorili žiadne sledovanie' })
    .toMatch(/^\d+$/);
  await expect(page.locator(RESULTS_PANEL)).toBeVisible();
  return Number(new URL(page.url()).searchParams.get('watch'));
}

/** Čisté čítanie API: prvá karta zhody, ktorej autor má adresu (slug); poradie zodpovedá kartám na obrazovke. */
async function firstMatchWithSlug(page: Page, watchId: number): Promise<Match | null> {
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/auth/offer-watches/${id}/matches/`, { credentials: 'include' });
    if (!response.ok) throw new Error(`Príprava: výsledky sledovania vrátili HTTP ${response.status}.`);
    const data = await response.json().catch(() => null);
    const items: Array<{ id?: number; owner_slug?: string | null; offer?: { id?: number; owner_slug?: string | null } }> =
      data?.results ?? [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const offerId = item.offer?.id ?? item.id;
      const slug = (item.offer?.owner_slug ?? item.owner_slug ?? '').trim();
      if (typeof offerId === 'number' && slug) return { index, offerId, slug };
    }
    return null;
  }, watchId);
}

test.describe('desktop', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'webkit-mobile', 'Karty zhôd sú len na PC (od 1024 px).');
  });

  test('an author header opens the profile even when the app already stands on that author profile page', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // 1. Zistí sa, ktoré sledovanie aplikácia otvorí z ľavého menu a kto je autor jeho prvej karty s adresou.
    await page.goto('/dashboard');
    await expect(page.locator(MAIN)).toBeVisible();
    const watchId = await openWatchesFromMenu(page);
    const match = await firstMatchWithSlug(page, watchId);
    test.skip(!match, 'Prvé sledovanie nemá živú zhodu s autorom, ktorý má adresu profilu.');
    if (!match) return;

    // 2. Tvrdé načítanie profilu toho autora: Next stránka Dashboardu je teraz presne tento profil.
    await page.goto(`/dashboard/users/${match.slug}`);
    await expect(page.getByRole('button', { name: 'Poslať správu' })).toBeVisible();

    // 3. Ľavé menu Sledovania otvorí rovnaké sledovanie a klik na hlavičku autora jeho karty.
    expect(await openWatchesFromMenu(page), 'Sledovania z ľavého menu otvorili iné sledovanie').toBe(watchId);
    const cards = page.locator(RESULTS_PANEL).getByRole('article');
    await expect(cards.nth(match.index)).toBeVisible();
    await cards.nth(match.index).getByRole('button').first().click();

    // Samotná adresa nestačí: pri chybe sa zmenila a obrazovka ostala na kartách zhôd.
    await expect
      .poll(() => decodeURIComponent(pathOf(page)), { message: 'Adresa nie je profil autora' })
      .toBe(`/dashboard/users/${match.slug}`);
    await expect(page.locator(RESULTS_PANEL), 'Obrazovka ostala na Sledovaniach').toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Poslať správu' })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('highlight')).toBe(String(match.offerId));
    await expect(page.locator(`${MAIN} .highlight-offer-card`).filter({ visible: true })).toBeVisible();
  });
});
