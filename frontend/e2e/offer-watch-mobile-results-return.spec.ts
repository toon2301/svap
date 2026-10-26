import { expect, test, type Page } from '@playwright/test';
import { readWatches } from './support/offer-watch';

const SOURCE = '/dashboard/watches?from=ow12#results';
const SCREEN = 'offer-watch-mobile-screen';
const WATCH_API = /\/api\/auth\/offer-watches\//;

// Only navigation and unsubmitted forms. Block unexpected writes rather than altering test content.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

// Service worker aplikácie (public/sw.js) preposiela každé volanie /api/ cez vlastný fetch. Také požiadavky
// `page.route` nevidí, takže by strážca zápisov (a simulovaná odpoveď) mlčky nefungoval. Preto sa worker
// v tomto špecu blokuje.
test.use({ serviceWorkers: 'block' });

let attemptedWrites: string[] = [];

/** Open real mobile results guidance and then the existing management screen. */
async function openManager(page: Page): Promise<void> {
  await page.goto(SOURCE);
  const notice = page.getByTestId('offer-watch-results-mobile-unavailable');
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'Spravovať sledovania', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings\/watches(?:\?|$)/);
  await expect(page.getByTestId(SCREEN).getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
}

/** The source URL/content must be restored, not a Settings overlay above the results page. */
async function expectResultsSource(page: Page): Promise<void> {
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}${url.hash}` === SOURCE);
  await expect(page.getByTestId(SCREEN)).toHaveCount(0);
  await expect(page.getByTestId('offer-watch-results-mobile-unavailable')).toBeVisible();
  await expect(page.locator('[data-mobile-settings-scroll]')).toBeHidden();
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`OW-12 mobile results-origin return – ${theme}`, () => {
    test.beforeEach(async ({ page, baseURL, isMobile }) => {
      test.skip(!isMobile, 'WebKit mobile history regression; desktop is covered by search-to-offer-watches.');
      if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
        throw new Error('These tests are restricted to the configured Railway deployment.');
      }
      attemptedWrites = [];
      await page.addInitScript((value) => {
        localStorage.setItem('appLocale', 'sk');
        localStorage.setItem('svaply_theme', value);
      }, theme);
      await page.route(WATCH_API, async (route) => {
        if (!['GET', 'OPTIONS'].includes(route.request().method())) {
          attemptedWrites.push(route.request().method());
          await route.abort();
        } else {
          await route.continue();
        }
      });
    });

    test.afterEach(({ isMobile }) => {
      if (!isMobile) return;
      // Keep the write guard active until Playwright disposes this test's page.
      expect(attemptedWrites, 'Navigation/cancel must not attempt to modify saved watches').toEqual([]);
    });

    test('reload preserves results origin, parameters and fragment; the app arrow returns to results', async ({ page }) => {
      await openManager(page);
      await page.reload();
      await expect(page.getByTestId(SCREEN).getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
      await page.getByTestId(SCREEN).getByRole('button', { name: 'Späť', exact: true }).click();
      await expectResultsSource(page);
    });

    test('create → country picker → form → list → results uses one Back per step without saving', async ({ page }) => {
      await openManager(page);
      const owned = await readWatches(page);
      test.skip(owned.length >= 5, 'No free creation slot; existing watches are not edited or deleted. This is NOT a nested-create PASS.');
      const screen = page.getByTestId(SCREEN);
      await screen.getByRole('button', { name: 'Vytvoriť sledovanie', exact: true }).click();
      await expect(screen.getByRole('heading', { name: 'Vytvoriť sledovanie', exact: true })).toBeVisible();
      await screen.getByRole('button', { name: /^Krajina:/ }).click();
      await expect(screen.getByRole('heading', { name: 'Krajina', exact: true })).toBeVisible();
      await page.goBack();
      await expect(screen.getByRole('heading', { name: 'Vytvoriť sledovanie', exact: true })).toBeVisible();
      await screen.getByRole('button', { name: 'Späť', exact: true }).click();
      await expect(screen.getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
      await page.goBack();
      await expectResultsSource(page);
    });

    test('Settings entry keeps the original Settings return; a direct manager URL keeps its fallback', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.getByTestId('feed-list')).toBeVisible();
      // The app's Settings menu is entered through the own profile, not the home top bar.
      await page.getByRole('button', { name: 'Profil', exact: true }).filter({ visible: true }).tap();
      await expect(page).toHaveURL(/\/dashboard\/users\/[^/?]+(?:\?|$)/);
      await page.getByRole('button', { name: 'Menu', exact: true }).filter({ visible: true }).tap();
      const settings = page.locator('[data-mobile-settings-scroll]');
      await expect(settings).toBeVisible();
      await settings.locator('[data-mobile-settings-item="offer-watches"]').click();
      await expect(page.getByTestId(SCREEN).getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
      await page.getByTestId(SCREEN).getByRole('button', { name: 'Späť', exact: true }).click();
      await expect(settings).toBeVisible();
      await expect(page.getByTestId(SCREEN)).toHaveCount(0);

      await page.goto('/dashboard/settings/watches');
      await expect(page.getByTestId(SCREEN).getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(/\/dashboard\/settings(?:\?|$)/);
      await expect(settings).toBeVisible();
      await expect(page.getByTestId(SCREEN)).toHaveCount(0);
    });
  });
}
