import { expect, test } from '@playwright/test';
import {
  RESULTS_PANEL,
  expectErrorAfterAllCards,
  expectErrorBeforeCards,
  expectOriginalCards,
  markOriginalCards,
  matchesUrl,
  matchPage,
  openResults,
  paginatedWatchOrSkip,
} from './support/offer-watch-results';

// Run AFTER deployment. The fixture is an existing owned watch; all fixture calls are GET.
// Abort only its matches request, never authentication, the watch list, or other API traffic.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

// Service worker aplikácie (public/sw.js) preposiela každé volanie /api/ cez vlastný fetch. Také požiadavky
// `page.route` nevidí, takže by strážca zápisov (a simulovaná odpoveď) mlčky nefungoval. Preto sa worker
// v tomto špecu blokuje.
test.use({ serviceWorkers: 'block' });

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Offer Watch pagination errors – ${theme}`, () => {
    test.beforeEach(async ({ page, baseURL }) => {
      if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
        throw new Error('These tests are restricted to the configured Railway deployment.');
      }
      await page.addInitScript((value) => {
        localStorage.setItem('appLocale', 'sk');
        localStorage.setItem('svaply_theme', value);
      }, theme);
    });

    test('desktop: failed next page stays below every card, repeated failure and keyboard retry preserve the cursor', async ({ page, isMobile }) => {
      test.skip(isMobile, 'The mobile results screen is not implemented; it has a separate guidance regression.');
      test.setTimeout(90_000);
      const watch = await paginatedWatchOrSkip(page);
      const first = await openResults(page, watch.id);
      expect(first.next, 'Fixture lost its next page during preparation.').not.toBeNull();
      const panel = page.locator(RESULTS_PANEL);
      const count = await markOriginalCards(panel);
      const interceptedCursors: (string | null)[] = [];
      let mode: 'fail' | 'hold' = 'fail';
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      /** Intercept only this fixture's cursor requests, leaving its first page and auth intact. */
      const matcher = (url: URL) => matchesUrl(watch.id, url) && url.searchParams.has('cursor');
      await page.route(matcher, async (route) => {
        if (route.request().method() !== 'GET') { await route.continue(); return; }
        interceptedCursors.push(new URL(route.request().url()).searchParams.get('cursor'));
        if (mode === 'fail') await route.abort('failed');
        else { await gate; await route.continue(); }
      });

      try {
        await panel.getByRole('button', { name: 'Zobraziť ďalšie', exact: true }).click();
        await expectErrorAfterAllCards(panel);
        await expectOriginalCards(panel, count);
        await expect(panel.getByRole('article')).toHaveCount(count);
        await expect(panel.getByRole('button', { name: 'Zobraziť ďalšie', exact: true })).toHaveCount(0);
        const retry = panel.getByRole('button', { name: 'Skúsiť znova', exact: true });
        await expect(retry).toHaveCount(1);
        await retry.click();
        await expect.poll(() => interceptedCursors.length).toBe(2);
        await expectErrorAfterAllCards(panel);
        await expectOriginalCards(panel, count);
        expect(interceptedCursors).toHaveLength(2);

        mode = 'hold';
        const responsePromise = page.waitForResponse((response) =>
          response.request().method() === 'GET' && matcher(new URL(response.url())),
        ).catch(() => null);
        const requestPromise = page.waitForRequest((request) =>
          request.method() === 'GET' && matcher(new URL(request.url())),
        ).catch(() => null);
        await retry.focus();
        await expect(retry).toBeFocused();
        await retry.press('Enter');
        if (!await requestPromise) throw new Error('Keyboard retry did not issue a matches request.');
        const loading = panel.getByRole('button', { name: 'Načítavam ďalšie...', exact: true });
        await expect(loading).toBeDisabled();
        await expect(panel.getByRole('button', { name: 'Obnoviť', exact: true })).toBeDisabled();
        await expect(panel.getByRole('alert')).toHaveCount(0);
        await expectOriginalCards(panel, count);
        // A native disabled control cannot issue another request on repeated activation.
        await loading.evaluate((button: HTMLButtonElement) => button.click());
        expect(interceptedCursors).toHaveLength(3);
        expect(new Set(interceptedCursors).size).toBe(1);
        expect(interceptedCursors[0]).toBe(new URL(first.next!).searchParams.get('cursor'));
        release();
        const response = await responsePromise;
        if (!response) throw new Error('Retry did not produce a matches response.');
        expect(response.status()).toBe(200);
        const second = matchPage(await response.json());
        await expect(panel.getByRole('article')).toHaveCount(new Set([...first.ids, ...second.ids]).size);
        await expectOriginalCards(panel, count);
        await expect(panel.getByRole('alert')).toHaveCount(0);
        if (second.next) await expect(panel.getByRole('button', { name: 'Zobraziť ďalšie', exact: true })).toBeEnabled();
        else await expect(panel.getByRole('button', { name: 'Zobraziť ďalšie', exact: true })).toHaveCount(0);
      } finally {
        release();
        await page.unroute(matcher);
      }
    });

    test('desktop: first-page failure retries the first page without showing a false empty state', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Desktop results only.');
      const watch = await paginatedWatchOrSkip(page);
      /** Fail only the fixture's initial page so retry must restart without a cursor. */
      const matcher = (url: URL) => matchesUrl(watch.id, url) && !url.searchParams.has('cursor');
      let blocked = true;
      const cursors: (string | null)[] = [];
      await page.route(matcher, async (route) => {
        if (route.request().method() !== 'GET') { await route.continue(); return; }
        cursors.push(new URL(route.request().url()).searchParams.get('cursor'));
        if (blocked) await route.abort('failed'); else await route.continue();
      });
      try {
        await page.goto(`/dashboard/watches?watch=${watch.id}`);
        const panel = page.locator(RESULTS_PANEL);
        await expect(panel.getByRole('alert')).toHaveCount(1);
        await expect(panel.getByRole('article')).toHaveCount(0);
        await expect(panel.getByText('Zatiaľ žiadne zhody', { exact: true })).toHaveCount(0);
        blocked = false;
        const responsePromise = page.waitForResponse((response) =>
          response.request().method() === 'GET' && matcher(new URL(response.url())),
        ).catch(() => null);
        await panel.getByRole('button', { name: 'Skúsiť znova', exact: true }).click();
        const response = await responsePromise;
        if (!response) throw new Error('Initial-page retry did not produce a matches response.');
        expect(response.status()).toBe(200);
        const restored = matchPage(await response.json());
        await expect(panel.getByRole('article')).toHaveCount(restored.ids.length);
        await expect(panel.getByRole('alert')).toHaveCount(0);
        expect(cursors).toEqual([null, null]);
      } finally { await page.unroute(matcher); }
    });

    test('desktop: refresh failure remains above preserved cards and retry restarts the first page', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Desktop results only.');
      const watch = await paginatedWatchOrSkip(page);
      await openResults(page, watch.id);
      const panel = page.locator(RESULTS_PANEL);
      const count = await markOriginalCards(panel);
      /** Observe this watch's refresh/retry requests without blocking unrelated endpoints. */
      const matcher = (url: URL) => matchesUrl(watch.id, url);
      let blocked = true;
      const cursors: (string | null)[] = [];
      await page.route(matcher, async (route) => {
        if (route.request().method() !== 'GET') { await route.continue(); return; }
        cursors.push(new URL(route.request().url()).searchParams.get('cursor'));
        if (blocked) await route.abort('failed'); else await route.continue();
      });
      try {
        await panel.getByRole('button', { name: 'Obnoviť', exact: true }).click();
        await expectErrorBeforeCards(panel);
        await expectOriginalCards(panel, count);
        await expect(panel.getByRole('article')).toHaveCount(count);
        await expect(panel.getByRole('button', { name: 'Zobraziť ďalšie', exact: true })).toHaveCount(0);
        blocked = false;
        const responsePromise = page.waitForResponse((response) =>
          response.request().method() === 'GET' && matcher(new URL(response.url())),
        ).catch(() => null);
        await panel.getByRole('button', { name: 'Skúsiť znova', exact: true }).click();
        const response = await responsePromise;
        if (!response) throw new Error('Refresh retry did not produce a matches response.');
        expect(response.status()).toBe(200);
        const restored = matchPage(await response.json());
        await expect(panel.getByRole('article')).toHaveCount(restored.ids.length);
        await expect(panel.getByRole('alert')).toHaveCount(0);
        expect(cursors).toEqual([null, null]);
      } finally { await page.unroute(matcher); }
    });

    test('mobile: results route shows guidance and opens management, not an empty desktop panel', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile guidance regression, not mobile pagination.');
      await page.goto('/dashboard/watches');
      const notice = page.getByTestId('offer-watch-results-mobile-unavailable');
      await expect(notice).toBeVisible();
      await expect(page.locator(RESULTS_PANEL)).toHaveCount(0);
      await notice.getByRole('button', { name: 'Spravovať sledovania', exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/settings\/watches(?:\?|$)/);
      await expect(page.getByRole('button', { name: 'Vytvoriť sledovanie', exact: true })).toBeVisible();
      await page.goBack();
      await expect(notice).toBeVisible();
    });
  });
}
