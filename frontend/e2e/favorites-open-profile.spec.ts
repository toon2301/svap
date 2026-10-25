import { expect, test, type Locator, type Page } from '@playwright/test';

import { gotoDashboardHome, MAIN, pathOf, sideNav, topBarBack } from './support/dashboard';

// Obľúbené → profil (nález 162, T9.1). Klik na meno alebo hlavičku karty musí otvoriť profil, aj keď
// Dashboard stojí na Next stránke toho istého profilu (otvorený profil → ľavé menu → Obľúbené → tá istá
// osoba): dovtedy sa zmenila len adresa a obrazovka ostala na zozname. Test iba číta a klika na karty,
// nikdy na „Odobrať“ ani „Správa“; každá požiadavka okrem čítania sa preruší a test na ňu zlyhá.
// Dôsledok na produkcii: otvorenie cudzieho profilu zapíše 1 návštevu profilu na účet a deň.
// Potrebuje aspoň jedného obľúbeného používateľa s adresou (slug) a jedinečným menom, inak sa preskočí.

type Favorite = { slug: string; displayName: string };

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
  expect(attemptedWrites, 'Test Obľúbených nesmie nič zapisovať').toEqual([]);
});

/** Čisté čítanie API: prvý obľúbený s adresou a menom, ktoré nemá žiadny iný obľúbený. */
async function firstNamedFavorite(page: Page): Promise<Favorite | null> {
  return page.evaluate(async () => {
    const response = await fetch('/api/auth/dashboard/favorites/', { credentials: 'include' });
    if (!response.ok) throw new Error(`Príprava: obľúbení vrátili HTTP ${response.status}.`);
    const data = await response.json().catch(() => null);
    const users: Array<{ slug?: string | null; display_name?: string }> = data?.users ?? [];
    const names = users.map((user) => (user.display_name ?? '').trim());
    const match = users.find((user, index) => {
      const name = names[index];
      return Boolean(user.slug?.trim()) && Boolean(name) && names.filter((n) => n === name).length === 1;
    });
    if (!match) return null;
    return { slug: String(match.slug).trim(), displayName: (match.display_name ?? '').trim() };
  });
}

/** Zoznam Obľúbených je pripravený, keď sú v ňom karty (každá má tlačidlo „Odobrať“). */
async function expectFavoritesList(page: Page, favorite: Favorite): Promise<void> {
  await expect(page.locator(MAIN).getByRole('button', { name: 'Odobrať', exact: true }).first()).toBeVisible();
  await expect(cardName(page, favorite)).toBeVisible();
}

const cardName = (page: Page, favorite: Favorite): Locator =>
  page.locator(`${MAIN} button:has(> h2)`).filter({ hasText: favorite.displayName }).first();

const cardHeader = (page: Page, favorite: Favorite): Locator =>
  page.locator(`${MAIN} button[aria-label="${favorite.displayName}"]`).first();

/** Profil je skutočne na obrazovke: adresa, zmizol zoznam Obľúbených a objavili sa prvky profilu. */
async function expectProfileOpen(page: Page, favorite: Favorite, label: string): Promise<void> {
  await expect
    .poll(() => pathOf(page), { message: `${label}: adresa nie je profil` })
    .toBe(`/dashboard/users/${favorite.slug}`);
  // Samotná adresa nestačí: pri chybe sa zmenila a obrazovka ostala na zozname.
  await expect(
    page.locator(MAIN).getByRole('button', { name: 'Odobrať', exact: true }),
    `${label}: obrazovka ostala na zozname Obľúbených`,
  ).toHaveCount(0);
}

test.describe('desktop', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'webkit-mobile', 'Ľavé menu a karty Obľúbených – desktop.');
  });

  test('a favorite card opens the profile even when the app already stands on that profile page', async ({
    page,
  }) => {
    await gotoDashboardHome(page);
    const favorite = await firstNamedFavorite(page);
    test.skip(!favorite, 'Účet nemá obľúbeného používateľa s adresou a jedinečným menom.');
    if (!favorite) return;

    // Tvrdé načítanie profilu: Next stránka Dashboardu je teraz presne tento profil.
    await page.goto(`/dashboard/users/${favorite.slug}`);
    await expect(page.getByRole('button', { name: 'Poslať správu' })).toBeVisible();

    await sideNav(page, 'Obľúbené').click();
    await expectFavoritesList(page, favorite);

    await cardName(page, favorite).click();
    await expectProfileOpen(page, favorite, 'Klik na meno');
    await expect(page.getByRole('button', { name: 'Poslať správu' })).toBeVisible();

    // Znova cez ľavé menu a tentoraz hlavička karty.
    await sideNav(page, 'Obľúbené').click();
    await expectFavoritesList(page, favorite);

    await cardHeader(page, favorite).click();
    await expectProfileOpen(page, favorite, 'Klik na hlavičku');
    await expect(page.getByRole('button', { name: 'Poslať správu' })).toBeVisible();

    // Späť v prehliadači vráti na zoznam Obľúbených.
    await page.goBack();
    await expect.poll(() => pathOf(page), { message: 'Späť: nevrátilo na Obľúbené' }).toBe('/dashboard/favorites');
    await expectFavoritesList(page, favorite);
  });
});

test.describe('mobil', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'webkit-mobile', 'Srdce v hornej lište a šípka Späť – len webkit-mobile.');
  });

  test('a favorite card opens the profile, the app arrow returns to the list and the card opens it again', async ({
    page,
  }) => {
    await gotoDashboardHome(page);
    const favorite = await firstNamedFavorite(page);
    test.skip(!favorite, 'Účet nemá obľúbeného používateľa s adresou a jedinečným menom.');
    if (!favorite) return;

    await page.locator('button[aria-label="Obľúbené"]').first().tap();
    await expectFavoritesList(page, favorite);

    await cardName(page, favorite).tap();
    await expectProfileOpen(page, favorite, 'Klik na meno');
    await expect(topBarBack(page)).toBeVisible();

    // Šípka v aplikácii vráti na zoznam Obľúbených.
    await topBarBack(page).tap();
    await expect.poll(() => pathOf(page), { message: 'Šípka: nevrátila na Obľúbené' }).toBe('/dashboard/favorites');
    await expectFavoritesList(page, favorite);

    await cardHeader(page, favorite).tap();
    await expectProfileOpen(page, favorite, 'Klik na hlavičku');
  });
});
