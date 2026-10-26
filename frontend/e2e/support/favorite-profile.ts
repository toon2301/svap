import { expect, type Locator, type Page, type Route } from '@playwright/test';

import { MAIN, sideNav } from './dashboard';

// Spoločné pomôcky pre špecy, ktoré otvárajú cudzí profil z Obľúbených (iba čítanie).

export type Favorite = { id: number; slug: string; displayName: string };

/** Čisté čítanie API: prvý obľúbený s adresou a menom, ktoré nemá žiadny iný obľúbený. */
export async function firstNamedFavorite(page: Page): Promise<Favorite | null> {
  return page.evaluate(async () => {
    const response = await fetch('/api/auth/dashboard/favorites/', { credentials: 'include' });
    if (!response.ok) throw new Error(`Príprava: obľúbení vrátili HTTP ${response.status}.`);
    const data = await response.json().catch(() => null);
    const users: Array<{ id?: number; slug?: string | null; display_name?: string }> = data?.users ?? [];
    const names = users.map((user) => (user.display_name ?? '').trim());
    const index = users.findIndex((user, position) => {
      const name = names[position];
      return (
        Number.isInteger(user.id) &&
        Boolean(user.slug?.trim()) &&
        Boolean(name) &&
        names.filter((other) => other === name).length === 1
      );
    });
    if (index < 0) return null;
    const user = users[index];
    return { id: Number(user.id), slug: String(user.slug).trim(), displayName: names[index] };
  });
}

/** Klik/ťuk podľa zariadenia: v projekte iPhone sa ťuká, inak klikne. */
export async function press(locator: Locator, isMobile: boolean): Promise<void> {
  if (isMobile) await locator.tap();
  else await locator.click();
}

/** Obľúbené: na PC cez ľavé menu, na mobile cez srdce v hornej lište (Nástenka). */
export async function openFavorites(page: Page, isMobile: boolean): Promise<void> {
  if (isMobile) await page.locator('button[aria-label="Obľúbené"]').first().tap();
  else await sideNav(page, 'Obľúbené').click();
}

/** Meno karty (presná zhoda nadpisu, nie podreťazec). */
export function favoriteName(page: Page, favorite: Favorite): Locator {
  return page
    .locator(`${MAIN} button:has(> h2)`)
    .filter({ has: page.getByRole('heading', { name: favorite.displayName, exact: true }) })
    .first();
}

/** Zoznam Obľúbených je pripravený, keď sú v ňom karty (každá má tlačidlo „Odobrať“). */
export async function expectFavoritesList(page: Page, favorite: Favorite): Promise<void> {
  await expect(page.locator(MAIN).getByRole('button', { name: 'Odobrať', exact: true }).first()).toBeVisible();
  await expect(favoriteName(page, favorite)).toBeVisible();
}

/** Zápisy, ktoré test pokúsil odoslať (mimo simulovaných): na ne musí test zlyhať. */
export type WriteGuard = { attempted: string[] };

/** Preruší každú požiadavku okrem čítania (a obnovy relácie) a zapíše ju do `guard.attempted`. */
export async function guardWrites(page: Page, guard: WriteGuard): Promise<void> {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route: Route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const sessionRefresh = ['/api/token/refresh/', '/api/auth/token/refresh/'].includes(pathname);
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || sessionRefresh) {
        await route.continue();
      } else {
        guard.attempted.push(`${request.method()} ${pathname}`);
        await route.abort();
      }
    },
  );
}
