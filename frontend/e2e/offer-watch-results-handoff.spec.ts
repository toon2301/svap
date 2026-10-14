import { expect, test, type Page } from '@playwright/test';
import { readWatches } from './support/offer-watch';

const SCREEN = 'offer-watch-mobile-screen';
const WATCH_API = /\/api\/auth\/offer-watches\//;

// Real Railway UI only. Never save forms, seed records, or expose account data in attachments.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
let attemptedWrites: string[] = [];

/** Use an existing watch, if available, so the desktop results selection retains the exact source URL. */
async function openMobileManager(page: Page): Promise<string> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard/watches');
  await expect(page.getByTestId('offer-watch-results-mobile-unavailable')).toBeVisible();
  const watches = await readWatches(page);
  const query = new URLSearchParams({ from: 'ow12-handoff' });
  if (watches.length) query.set('watch', String(watches[0].id));
  const source = `/dashboard/watches?${query}#results`;
  await page.goto(source);
  await page.getByTestId('offer-watch-results-mobile-unavailable')
    .getByRole('button', { name: 'Spravovať sledovania', exact: true }).click();
  await expect(page.getByTestId(SCREEN).getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
  return source;
}

/** Changing layout must reuse the manager entry and display its actual desktop content. */
async function handoffToDesktop(page: Page): Promise<void> {
  const length = await page.evaluate(() => window.history.length);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByTestId(SCREEN)).toHaveCount(0);
  await expect(page.locator('[data-dashboard-main]').getByRole('heading', { name: 'Sledovanie', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.history.length), 'Resize must not insert another manager entry').toBe(length);
}

/** Check the real results content and complete source location, not just the pathname. */
async function expectResults(page: Page, source: string, mobile: boolean): Promise<void> {
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}${url.hash}` === source);
  await expect(page.getByTestId(SCREEN)).toHaveCount(0);
  if (mobile) await expect(page.getByTestId('offer-watch-results-mobile-unavailable')).toBeVisible();
  else await expect(page.locator('[data-dashboard-main]').getByRole('heading', { level: 1, name: 'Sledovania', exact: true })).toBeVisible();
  await expect(page.locator('[data-mobile-settings-scroll]')).toBeHidden();
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Offer Watch results responsive handoff – ${theme}`, () => {
    test.beforeEach(async ({ page, baseURL }) => {
      if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
        throw new Error('These tests are restricted to the configured Railway deployment.');
      }
      attemptedWrites = [];
      await page.addInitScript((value) => {
        localStorage.setItem('appLocale', 'sk');
        localStorage.setItem('svaply_theme', value);
      }, theme);
      await page.route(WATCH_API, async (route) => {
        const method = route.request().method();
        if (!['GET', 'OPTIONS'].includes(method)) {
          attemptedWrites.push(method);
          await route.abort();
        } else await route.continue();
      });
    });

    test.afterEach(() => {
      expect(attemptedWrites, 'Layout changes and Back must not modify saved watches').toEqual([]);
    });

    test('mobile → desktop app Back returns directly to the exact results URL', async ({ page }) => {
      const source = await openMobileManager(page);
      await handoffToDesktop(page);
      await page.locator('[data-dashboard-main]').getByRole('button', { name: 'Späť', exact: true }).click();
      await expectResults(page, source, false);
    });

    test('desktop browser Back/Forward then mobile Back preserves the original results entry', async ({ page }) => {
      const source = await openMobileManager(page);
      await handoffToDesktop(page);
      await page.goBack();
      await expectResults(page, source, false);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goForward();
      await expect(page.getByTestId(SCREEN).getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
      await page.getByTestId(SCREEN).getByRole('button', { name: 'Späť', exact: true }).click();
      await expectResults(page, source, true);
    });

    test('mobile → desktop → mobile adds no entry and restores results after reload', async ({ page }) => {
      const source = await openMobileManager(page);
      await handoffToDesktop(page);
      const length = await page.evaluate(() => window.history.length);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByTestId(SCREEN).getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
      expect(await page.evaluate(() => window.history.length), 'Returning to mobile must not insert a direct-entry fallback').toBe(length);
      await page.reload();
      await expect(page.getByTestId(SCREEN).getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
      await page.getByTestId(SCREEN).getByRole('button', { name: 'Späť', exact: true }).click();
      await expectResults(page, source, true);
    });

    test('edit country picker → desktop → mobile list Back leaves the nested session without saving', async ({ page }) => {
      const source = await openMobileManager(page);
      const owned = await readWatches(page);
      test.skip(owned.length === 0, 'No existing watch to open; nothing is created. This is NOT a nested-edit PASS.');
      const screen = page.getByTestId(SCREEN);
      await screen.getByRole('button', { name: 'Upraviť sledovanie', exact: true }).first().click();
      await expect(screen.getByRole('heading', { name: 'Upraviť sledovanie', exact: true })).toBeVisible();
      await screen.getByRole('button', { name: /^Krajina:/ }).click();
      await expect(screen.getByRole('heading', { name: 'Krajina', exact: true })).toBeVisible();
      await handoffToDesktop(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(screen.getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
      await screen.getByRole('button', { name: 'Späť', exact: true }).click();
      await expectResults(page, source, true);
    });
  });
}
