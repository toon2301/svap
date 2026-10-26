import { expect, test } from '@playwright/test';

import { gotoDashboardHome, pathOf } from './support/dashboard';
import {
  expectFavoritesList,
  favoriteName,
  firstNamedFavorite,
  guardWrites,
  openFavorites,
  press,
  type WriteGuard,
} from './support/favorite-profile';

// Zablokovanie z profilu (nález 172). Po „Zablokovať“ musela byť na obrazovke Nástenka, nie profil
// zablokovaného, aj keď Dashboard stojí na Next stránke /dashboard a profil sa otvoril udalosťou
// (z Obľúbených): dovtedy sa zmenila len adresa. Skutočné zablokovanie na produkcii by bolo zápisom,
// preto sa požiadavka POST na zablokovanie len PREDSTIERA: vybaví ju prehliadač (route.fulfill), na
// server sa nikdy neodošle. Každá iná požiadavka okrem čítania sa preruší a test na ňu zlyhá.
// Dôsledok na produkcii: otvorenie cudzieho profilu zapíše 1 návštevu profilu na účet a deň; klient
// si zablokovaného iba lokálne zabudne (cache), nič sa nemení na serveri. Potrebuje aspoň jedného
// obľúbeného používateľa s adresou a jedinečným menom, inak sa preskočí.

// Service worker aplikácie (public/sw.js) preposiela každé volanie /api/ cez vlastný fetch. Také požiadavky
// `page.route` nevidí, takže by strážca zápisov (a simulovaná odpoveď) mlčky nefungoval. Preto sa worker
// v tomto špecu blokuje.
test.use({ serviceWorkers: 'block' });

const guard: WriteGuard = { attempted: [] };

test.beforeEach(async ({ page }) => {
  guard.attempted = [];
  await guardWrites(page, guard);
});

test.afterEach(() => {
  expect(guard.attempted, 'Test zablokovania nesmie odoslať žiaden zápis na server').toEqual([]);
});

test('blocking from a profile opened from Favorites shows the feed, and Back or Forward right after it never show the blocked profile', async ({
  page,
  isMobile,
}) => {
  await gotoDashboardHome(page);
  const favorite = await firstNamedFavorite(page);
  test.skip(!favorite, 'Účet nemá obľúbeného používateľa s adresou a jedinečným menom.');
  if (!favorite) return;

  // Simulované zablokovanie: vybaví ho prehliadač, na server nejde (novší handler má prednosť pred strážcom).
  const simulatedBlocks: string[] = [];
  await page.route(
    (url) => url.pathname === `/api/auth/users/${favorite.id}/block/`,
    async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      simulatedBlocks.push(route.request().method());
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user_id: favorite.id, is_blocked: true }),
      });
    },
  );

  await openFavorites(page, isMobile);
  await expectFavoritesList(page, favorite);
  await press(favoriteName(page, favorite), isMobile);

  // Menu v hornej lište mobilu je viditeľné skôr, než sa profil načíta (vtedy ťuk nič neotvorí):
  // počká sa na hotový profil.
  const sendMessage = page.getByRole('button', { name: 'Poslať správu' });
  await expect(sendMessage).toBeVisible();
  await press(page.locator('button[aria-label="Menu"]:visible').first(), isMobile);
  await press(page.getByRole('button', { name: 'Zablokovať' }).first(), isMobile);
  await press(page.getByRole('alertdialog').getByRole('button', { name: 'Zablokovať' }), isMobile);

  // Samotná adresa nestačí: pri chybe sa zmenila a profil zablokovaného ostal na obrazovke.
  await expect(page.getByTestId('feed-list')).toBeVisible();
  await expect.poll(() => pathOf(page), { message: 'Adresa nie je Nástenka' }).toBe('/dashboard');
  expect(simulatedBlocks, 'Simulované zablokovanie sa malo vybaviť práve raz').toHaveLength(1);

  // Späť a Dopredu hneď po zablokovaní nikdy nevrátia profil zablokovaného: prepísaný záznam aj
  // pridaný záznam Nástenky majú adresu /dashboard (kontrola adresy a feedu je deterministická,
  // samotné „profil nie je vidieť“ by prešlo ešte pred jeho načítaním).
  await page.goBack();
  await expect.poll(() => pathOf(page), { message: 'Späť: adresa nie je Nástenka' }).toBe('/dashboard');
  await expect(page.getByTestId('feed-list')).toBeVisible();
  await expect(sendMessage, 'Späť vrátilo profil zablokovaného').toHaveCount(0);
  await page.goForward();
  await expect.poll(() => pathOf(page), { message: 'Dopredu: adresa nie je Nástenka' }).toBe('/dashboard');
  await expect(page.getByTestId('feed-list')).toBeVisible();
  await expect(sendMessage, 'Dopredu vrátilo profil zablokovaného').toHaveCount(0);
});
