import { expect, test } from '@playwright/test';
import {
  LIKE_LABEL,
  expectNoWatchLike,
  flipWatchCardBothWays,
  ownProfileWithCardsOrSkip,
  watchWithCardsOrSkip,
} from './support/offer-watch-card-actions';
import { RESULTS_PANEL, openResults } from './support/offer-watch-results';

// Run against Railway after deployment. Reuse existing watches/cards; never click Like or save content.
// No personal response bodies, credentials, trace, screenshots, or videos are attached to reports.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
let attemptedWrites: string[] = [];

for (const theme of ['light', 'dark'] as const) {
  test.describe(`OW-03 scoped card actions – ${theme}`, () => {
    test.beforeEach(async ({ page, baseURL }) => {
      if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
        throw new Error('These tests are restricted to the configured Railway deployment.');
      }
      attemptedWrites = [];
      await page.addInitScript((value) => {
        localStorage.setItem('appLocale', 'sk');
        localStorage.setItem('svaply_theme', value);
      }, theme);
      await page.route((url) => /^\/api\/auth\/(?:offer-watches|skills)(?:\/|$)/.test(url.pathname), async (route) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
          await route.continue();
        } else {
          attemptedWrites.push(route.request().method());
          await route.abort();
        }
      });
    });

    test.afterEach(() => {
      expect(attemptedWrites, 'Read-only card-action regressions must not modify watches/cards/likes').toEqual([]);
    });

    for (const isSeeking of [false, true]) {
      test(`desktop: ${isSeeking ? 'demand' : 'offer'} results have no Like on either face and still flip`, async ({ page, isMobile }) => {
        test.skip(isMobile, 'Mobile has guidance, not a full results grid.');
        test.setTimeout(90_000);
        const watch = await watchWithCardsOrSkip(page, isSeeking);
        const first = await openResults(page, watch.id);
        expect(first.ids.length, 'Reusable result cards disappeared during fixture preparation.').toBeGreaterThan(0);
        const panel = page.locator(RESULTS_PANEL);
        const cards = panel.getByRole('article');
        for (let index = 0; index < first.ids.length; index += 1) {
          await expectNoWatchLike(cards.nth(index));
        }
        await flipWatchCardBothWays(cards.first());
        await expect(cards).toHaveCount(first.ids.length);
        await expect(page).toHaveURL((url) => url.pathname === '/dashboard/watches' && url.searchParams.get('watch') === String(watch.id));
      });
    }

    test('desktop: author profile navigation still highlights the matched card; profile Like remains available', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Desktop results author/profile regression.');
      test.setTimeout(90_000);
      const watch = await watchWithCardsOrSkip(page);
      const first = await openResults(page, watch.id);
      expect(first.ids.length, 'Reusable result cards disappeared during fixture preparation.').toBeGreaterThan(0);
      const card = page.locator(RESULTS_PANEL).getByRole('article').first();
      await expectNoWatchLike(card);
      const source = page.url();
      // The author header is the first button in the article, not the Like/flip/review action.
      await card.getByRole('button').first().click();
      await expect(page).toHaveURL((url) => /^\/dashboard\/users\/[^/]+$/.test(url.pathname) && url.searchParams.get('highlight') === String(first.ids[0]));
      const highlighted = page.locator('[data-dashboard-main] .highlight-offer-card').filter({ visible: true });
      await expect(highlighted).toBeVisible();
      await expect(highlighted.getByRole('button', { name: LIKE_LABEL, exact: true })).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(source);
      await expect(page.locator(RESULTS_PANEL).getByRole('article').first()).toBeVisible();
      await expectNoWatchLike(page.locator(RESULTS_PANEL).getByRole('article').first());
    });

    test('desktop: the shared search-result card retains its Like control', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Search uses the shared desktop card outside Offer Watch.');
      test.setTimeout(90_000);
      const watch = await watchWithCardsOrSkip(page);
      const query = (process.env.E2E_SEARCH_NAV_QUERY ?? watch.subcategory).trim();
      if (query.length < 2) throw new Error('The reusable search query must have at least two characters.');
      const responsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname === '/api/auth/search/global/' && url.searchParams.get('q') === query;
      }).catch(() => null);
      await page.goto(`/search?q=${encodeURIComponent(query)}&tab=all`);
      const response = await responsePromise;
      if (!response) throw new Error('Search did not produce its real global-results request.');
      expect(response.status(), 'Search must succeed; authentication/network errors must not be skipped').toBe(200);
      const data = await response.json();
      if (!Array.isArray(data.offers)) throw new Error('Search returned an invalid offers collection.');
      test.skip(data.offers.length === 0, 'No existing search-card fixture for this query. This is NOT a search-Like PASS.');
      const main = page.locator('[data-dashboard-main]');
      await expect(main.getByRole('heading', { level: 1, name: /Výsledky vyhľadávania pre:/ })).toBeVisible();
      await expect(main.getByRole('button', { name: LIKE_LABEL, exact: true }).first()).toBeVisible();
    });

    test('mobile: results guidance stays visible and management returns to it', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile guidance, not a new mobile results implementation.');
      await page.goto('/dashboard/watches');
      const notice = page.getByTestId('offer-watch-results-mobile-unavailable');
      await expect(notice).toBeVisible();
      await expect(page.locator(RESULTS_PANEL)).toHaveCount(0);
      await notice.getByRole('button', { name: 'Spravovať sledovania', exact: true }).tap();
      const screen = page.getByTestId('offer-watch-mobile-screen');
      await expect(screen.getByRole('heading', { name: 'Uložené sledovania', exact: true })).toBeVisible();
      await screen.getByRole('button', { name: 'Späť', exact: true }).tap();
      await expect(page).toHaveURL(/\/dashboard\/watches(?:\?|$)/);
      await expect(notice).toBeVisible();
      await expect(screen).toHaveCount(0);
    });

    test('mobile: Like remains present on existing own-profile cards', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile profile-control regression.');
      await ownProfileWithCardsOrSkip(page, isMobile);
      // Check presence only: clicking Like would mutate production fixture state.
      await expect(page.locator('[data-dashboard-main]').getByRole('button', { name: LIKE_LABEL, exact: true }).first()).toBeVisible();
    });
  });
}
