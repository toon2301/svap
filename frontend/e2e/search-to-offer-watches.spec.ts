import { expect, test, type Locator, type Page } from '@playwright/test';
import { gotoDashboardHome, historyLength, mainInstance, recordMainInstance } from './support/dashboard';
import { observePage, reportFailureEvidence } from './support/page-activity';

// Run against Railway AFTER deployment. Reuse existing content; never create/edit cards or watches.
// Disable trace/screenshot/video attachments; never print personal API bodies or credentials.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

/** The actual left-navigation entry, including its SearchLayout-specific handler. */
function nav(page: Page, id: string): Locator {
  return page.locator(`[data-sidebar="left"] [data-sidebar-nav-item="${id}"]`);
}

/** Confirm real page content, not just an address changed by pushState. */
async function expectSearchPage(page: Page): Promise<void> {
  await expect(page.locator('[data-dashboard-main]').getByRole('heading', { level: 1, name: /Výsledky vyhľadávania pre:/ })).toBeVisible();
}

/** Check a cross-layout navigation, query isolation, and one-step browser Back/Forward. */
async function openWatchesAndCheckHistory(page: Page, activate: () => Promise<void>): Promise<void> {
  const source = page.url();
  const sourceMain = await mainInstance(page);
  const length = await historyLength(page);
  await activate();
  await expect(page).toHaveURL(/\/dashboard\/watches(?:\?|$)/);
  const main = page.locator('[data-dashboard-main]');
  await expect(main.getByRole('heading', { level: 1, name: 'Sledovania', exact: true })).toBeVisible();
  await expect(main.getByRole('button', { name: 'Spravovať sledovania', exact: true }).first()).toBeVisible();
  expect(await mainInstance(page), 'Next navigation must replace the standalone search layout').not.toBe(sourceMain);
  expect(await historyLength(page)).toBe(length + 1);
  for (const key of new URL(source).searchParams.keys()) {
    expect(new URL(page.url()).searchParams.has(key), `Search parameter ${key} leaked into watches`).toBe(false);
  }
  await page.goBack();
  await expect(page).toHaveURL(source);
  await expectSearchPage(page);
  await page.goForward();
  await expect(page).toHaveURL(/\/dashboard\/watches(?:\?|$)/);
  await expect(main.getByRole('heading', { level: 1, name: 'Sledovania', exact: true })).toBeVisible();
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Search → Offer Watch navigation – ${theme}`, () => {
    test.beforeEach(async ({ page, baseURL }) => {
      if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
        throw new Error('These tests are restricted to the configured Railway deployment.');
      }
      await page.addInitScript((value) => {
        localStorage.setItem('appLocale', 'sk');
        localStorage.setItem('svaply_theme', value);
      }, theme);
      await recordMainInstance(page);
      observePage(page);
    });

    // Pri páde vypíše požiadavky a stav stránky bez osobných údajov (trace, screenshot a video sú v tomto špece vypnuté).
    test.afterEach(async ({ page }, testInfo) => {
      await reportFailureEvidence(page, testInfo);
    });

    for (const path of ['/search?q=te', '/search?q=te&tab=users', '/search?q=te&tab=offers&type=offer&price_min=5']) {
      test(`desktop: ${path} → watches → Back/Forward`, async ({ page, isMobile }) => {
        test.skip(isMobile, 'The main left-navigation entry is desktop only.');
        await page.goto(path);
        await expectSearchPage(page);
        await openWatchesAndCheckHistory(page, () => nav(page, 'watches').click());
      });
    }

    test('desktop: real sidebar search → View All → watches (existing reusable results)', async ({ page, isMobile }) => {
      test.skip(isMobile, 'The search overlay and main left navigation are desktop only.');
      test.setTimeout(90_000);
      const query = (process.env.E2E_SEARCH_NAV_QUERY ?? 'te').trim();
      if (query.length < 2) throw new Error('E2E_SEARCH_NAV_QUERY must have at least two characters.');
      await gotoDashboardHome(page);
      await nav(page, 'search').click();
      const input = page.locator('[data-onboarding="search-input"] input').filter({ visible: true });
      const responsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return response.request().method() === 'GET'
          && url.pathname === '/api/auth/dashboard/search/' && url.searchParams.get('q') === query;
      });
      await input.fill(query);
      const response = await responsePromise;
      expect(response.status(), 'The real search request must succeed').toBe(200);
      const data = await response.json();
      const count = (Array.isArray(data.skills) ? data.skills.length : 0) + (Array.isArray(data.users) ? data.users.length : 0);
      test.skip(count === 0, 'No existing results for the fixture query; View All is not available. This is NOT a full-flow PASS.');
      await page.getByRole('button', { name: 'Zobraziť všetko', exact: true }).click();
      await expect(page).toHaveURL((url) => url.pathname === '/search' && url.searchParams.get('q') === query);
      await expectSearchPage(page);
      await openWatchesAndCheckHistory(page, () => nav(page, 'watches').click());
    });

    test('desktop: closed and reopened search panel keeps history; keyboard opens watches', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Desktop panel/keyboard regression.');
      await page.goto('/search?q=te');
      await expectSearchPage(page);
      const source = page.url();
      const length = await historyLength(page);
      const input = page.locator('[data-onboarding="search-input"] input').filter({ visible: true });
      await expect(input).toHaveCount(0);
      await nav(page, 'search').click();
      await expect(input).toBeVisible();
      expect(page.url()).toBe(source);
      expect(await historyLength(page)).toBe(length);
      await page.keyboard.press('Escape');
      await expect(input).toHaveCount(0);
      await nav(page, 'watches').focus();
      await openWatchesAndCheckHistory(page, () => page.keyboard.press('Enter'));
    });

    test('mobile: hidden desktop navigation; results guidance still opens management and returns', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'WebKit mobile regression, not a new mobile results implementation.');
      await page.goto('/search?q=te');
      await expectSearchPage(page);
      await expect(nav(page, 'watches')).toBeHidden();
      await page.goto('/dashboard/watches');
      const notice = page.getByTestId('offer-watch-results-mobile-unavailable');
      await expect(notice).toBeVisible();
      await notice.getByRole('button', { name: 'Spravovať sledovania', exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/settings\/watches(?:\?|$)/);
      await expect(page.getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(/\/dashboard\/watches(?:\?|$)/);
      await expect(notice).toBeVisible();
      await expect(page.getByTestId('offer-watch-mobile-screen')).toHaveCount(0);
      await page.goForward();
      await expect(page).toHaveURL(/\/dashboard\/settings\/watches(?:\?|$)/);
      await expect(page.getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
      await page.getByTestId('offer-watch-mobile-screen').getByRole('button', { name: 'Späť', exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/watches(?:\?|$)/);
      await expect(notice).toBeVisible();
    });
  });
}
