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

// Chybová obrazovka profilu → „Späť na nástenku“ (nález 172). Tlačidlo muselo zobraziť Nástenku, aj keď
// Dashboard stojí na Next stránke /dashboard a profil sa otvoril udalosťou (z Obľúbených): dovtedy
// sa zmenila len adresa a chybová obrazovka ostala. Test iba číta: profil obľúbeného sa v prehliadači
// nahradí odpoveďou 404 (na server sa nič nezapisuje, požiadavka na detail profilu sa vybaví lokálne),
// každá iná požiadavka okrem čítania sa preruší a test na ňu zlyhá. Potrebuje aspoň jedného
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
  expect(guard.attempted, 'Test chybovej obrazovky profilu nesmie nič zapisovať').toEqual([]);
});

test('"Späť na nástenku" on the profile error screen shows the feed even when the app stands on /dashboard', async ({
  page,
  isMobile,
}) => {
  await gotoDashboardHome(page);
  const favorite = await firstNamedFavorite(page);
  test.skip(!favorite, 'Účet nemá obľúbeného používateľa s adresou a jedinečným menom.');
  if (!favorite) return;

  // Detail profilu podľa ID zlyhá: aplikácia ukáže chybovú obrazovku s tlačidlom „Späť na nástenku“.
  await page.route(
    (url) => url.pathname === `/api/auth/dashboard/users/${favorite.id}/profile/`,
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"Not found."}' });
    },
  );

  await openFavorites(page, isMobile);
  await expectFavoritesList(page, favorite);
  await press(favoriteName(page, favorite), isMobile);

  const backHome = page.getByRole('button', { name: 'Späť na nástenku' });
  await expect(backHome).toBeVisible();
  await press(backHome, isMobile);

  // Samotná adresa nestačí: pri chybe sa zmenila a chybová obrazovka ostala.
  await expect(page.getByTestId('feed-list')).toBeVisible();
  await expect(backHome, 'Chybová obrazovka ostala na obrazovke').toHaveCount(0);
  await expect.poll(() => pathOf(page), { message: 'Adresa nie je Nástenka' }).toBe('/dashboard');

  // Späť v prehliadači nevráti chybovú obrazovku profilu.
  await page.goBack();
  await expect(page.getByTestId('feed-list')).toBeVisible();
  await expect(backHome, 'Späť vrátilo chybovú obrazovku profilu').toHaveCount(0);
});
