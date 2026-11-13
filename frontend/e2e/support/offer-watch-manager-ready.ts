import { expect, type Page, type Response } from '@playwright/test';
import messages from '../../messages/sk.json';
import { MAX_OFFER_WATCHES } from '../../src/components/dashboard/modules/offer-watch/types';

/** Zachytí pôvodný GET aplikácie; pomocník sám neposiela žiadnu požiadavku. */
export function isWatchManagerResponse(response: Response, pageUrl: string): boolean {
  try {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.origin === new URL(pageUrl).origin
      && url.pathname === '/api/auth/offer-watches/';
  } catch { return false; }
}

/**
 * Čakanie sa zapojí pred navigáciou. Preskočí iba prvú 401, po ktorej interceptor
 * aplikácie smie raz obnoviť reláciu a zopakovať GET. Ďalšia 401 aj ostatné chyby
 * sú konečný výsledok na overenie; pomocník nič neposiela a nemení timeout.
 */
export function waitForWatchManagerResponse(page: Page): Promise<Response> {
  let ignoredUnauthorized = false;
  return page.waitForResponse(response => {
    if (!isWatchManagerResponse(response, page.url())) return false;
    if (response.status() === 401 && !ignoredUnauthorized) {
      ignoredUnauthorized = true;
      return false;
    }
    return true;
  });
}

/**
 * Overí ustálený mobilný zoznam podľa skutočnej odpovede. Pri limite patrí do UI
 * hláška, nie tlačidlo; samotné viditeľné zakázané tlačidlo počas načítavania nestačí.
 * Zo súkromnej odpovede sa do asercií prenesie iba počet, nikdy údaje kariet.
 */
export async function expectLoadedWatchManager(page: Page, response: Response): Promise<number> {
  expect(response.status(), 'Načítanie správy sledovaní musí uspieť.').toBe(200);
  const data: unknown = await response.json().catch(() => null);
  const count = Array.isArray(data) ? data.length : null;
  if (count === null) throw new Error('Odpoveď správy sledovaní nie je platný zoznam.');

  const manager = page.getByTestId('offer-watch-mobile-screen');
  const slot = manager.getByTestId('offer-watch-create-slot');
  const create = slot.getByRole('button', { name: messages.offerWatch.createAction, exact: true });
  const limit = slot.getByRole('status');
  await expect(manager.getByRole('heading', { name: messages.offerWatch.savedTitle, exact: true })).toBeVisible();
  await expect(manager.getByLabel(messages.offerWatch.countLabel, { exact: true })).toHaveText(`${count} / ${MAX_OFFER_WATCHES}`);
  await expect(manager.getByTestId('offer-watch-list-loading')).toHaveCount(0);
  await expect(manager.getByRole('alert')).toHaveCount(0);
  await expect(manager.getByRole('article')).toHaveCount(count);
  if (count >= MAX_OFFER_WATCHES) {
    await expect(create).toHaveCount(0);
    await expect(limit).toBeVisible();
    await expect(limit).toHaveText(messages.offerWatch.limitReached);
  } else {
    await expect(limit).toHaveCount(0);
    await expect(create).toBeVisible();
    await expect(create).toBeEnabled();
  }
  return count;
}
