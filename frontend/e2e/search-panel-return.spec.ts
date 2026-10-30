import { expect, test, type Page } from './support/diagnostic-test';
import { bottomNav, gotoDashboardHome, sideNav } from './support/dashboard';
import { observePage } from './support/page-activity';
import { initializeSearchContext, isPanelSearch } from './support/search-country-scroll';
import {
  measureReturn,
  openLastAuthor,
  openReturnFixture,
  searchPanel,
  searchPanelInput,
} from './support/search-panel-return';

// Actual Railway GET responses only: no replacement search data or persistent content writes.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

// Service worker aplikácie (public/sw.js) preposiela každé volanie /api/ cez vlastný fetch. Také požiadavky
// `page.route` nevidí, takže by strážca zápisov (a simulovaná odpoveď) mlčky nefungoval. Preto sa worker
// v tomto špecu blokuje.
test.use({ serviceWorkers: 'block' });

/** Traverse the real Tab order from navigation into results, not just the first unrelated sidebar button. */
async function expectClosedPanelKeyboardIsolation(page: Page): Promise<void> {
  await sideNav(page, 'Vyhľadávanie').focus();
  let reachedResults = false;
  for (let step = 0; step < 25 && !reachedResults; step += 1) {
    await page.keyboard.press('Tab');
    expect(await searchPanel(page).evaluate((panel) => panel.contains(document.activeElement)),
      'A closed panel must never receive keyboard focus').toBe(false);
    reachedResults = await page.locator('[data-search-scroll-root]')
      .evaluate((main) => main.contains(document.activeElement));
  }
  expect(reachedResults, 'Tab must reach usable main results without entering the hidden panel').toBe(true);
}

test.describe('Search panel visibility and prompt profile returns', () => {
  let attemptedWrites: string[];

  test.beforeEach(async ({ page, baseURL }) => {
    if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
      throw new Error('These tests are restricted to the configured Railway deployment.');
    }
    attemptedWrites = [];
    observePage(page);
    await initializeSearchContext(page, 'dark');
    await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
      const request = route.request();
      const refresh = ['/api/token/refresh/', '/api/auth/token/refresh/']
        .includes(new URL(request.url()).pathname);
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || refresh) await route.continue();
      else {
        attemptedWrites.push(request.method());
        await route.abort();
      }
    });
  });

  test.afterEach(() => {
    expect(attemptedWrites, 'Navigation tests must not write content or account preferences').toEqual([]);
  });

  test('View All from dashboard closes the desktop panel and remains usable on mobile', async ({ page, isMobile }) => {
    await gotoDashboardHome(page);
    if (isMobile) {
      await bottomNav(page, 'Hľadať').tap();
      await expect(page).toHaveURL(/\/dashboard\/search(?:[?#]|$)/);
    } else await sideNav(page, 'Vyhľadávanie').click();
    const input = searchPanelInput(page);
    await expect(input, 'The real search screen must be visible before starting a request observer').toBeVisible();
    const query = process.env.E2E_SEARCH_NAV_QUERY?.trim() || 'te';
    const [response] = await Promise.all([
      page.waitForResponse((candidate) => isPanelSearch(candidate.request(), query)),
      input.fill(query),
    ]);
    expect(response.status()).toBe(200);
    await page.getByRole('button', { name: 'Zobraziť všetko', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === '/search' && url.searchParams.get('q') === query);
    await expect(searchPanel(page)).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('[data-search-scroll-root]').getByRole('heading', {
      level: 1, name: /Výsledky vyhľadávania pre:/,
    })).toBeVisible();
    if (isMobile) await expect(sideNav(page, 'Vyhľadávanie')).toBeHidden();
    else await expect(searchPanelInput(page)).toHaveCount(0);
  });

  test('another View All explicitly closes a manually reopened results panel', async ({ page, isMobile }) => {
    await openReturnFixture(page, 'offers');
    if (isMobile) {
      // The mobile results have no desktop panel: exercise their genuine return-to-search route instead.
      await page.getByRole('button', { name: 'Späť', exact: true }).filter({ visible: true }).first().tap();
      await expect(page).toHaveURL(/\/dashboard\/search(?:[?#]|$)/);
    } else {
      await expect(searchPanel(page)).toHaveAttribute('aria-hidden', 'true');
      await sideNav(page, 'Vyhľadávanie').click();
      await expect(searchPanel(page)).toHaveAttribute('aria-hidden', 'false');
    }
    const input = searchPanelInput(page);
    await expect(input, 'The real search screen must be visible before starting a request observer').toBeVisible();
    const query = (process.env.E2E_SEARCH_NAV_QUERY?.trim() || 'te').toUpperCase();
    const [response] = await Promise.all([
      page.waitForResponse((candidate) => isPanelSearch(candidate.request(), query)),
      input.fill(query),
    ]);
    expect(response.status()).toBe(200);
    await page.getByRole('button', { name: 'Zobraziť všetko', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === '/search' && url.searchParams.get('q') === query);
    await expect(searchPanel(page)).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('[data-search-scroll-root]').getByRole('heading', {
      level: 1, name: /Výsledky vyhľadávania pre:/,
    })).toBeVisible();
  });

  for (const tab of ['all', 'offers', 'users'] as const) {
    test(`${tab}: browser Back restores deep results promptly without opening the desktop panel`, async ({ page, isMobile }) => {
      await openReturnFixture(page, tab);
      // Do not press Escape: the production contract itself must start with a closed panel.
      await expect(searchPanel(page)).toHaveAttribute('aria-hidden', 'true');
      const position = await openLastAuthor(page, tab, isMobile);
      await measureReturn(page, position, () => page.goBack());
      if (isMobile) {
        const repeated = await openLastAuthor(page, tab, true);
        await measureReturn(page, repeated, () => page.getByRole('button', { name: 'Späť', exact: true })
          .filter({ visible: true }).first().tap());
      } else {
        // A user may still open/close the panel deliberately, without an extra history entry.
        const source = page.url();
        const historyLength = await page.evaluate(() => history.length);
        await expectClosedPanelKeyboardIsolation(page);
        await sideNav(page, 'Vyhľadávanie').focus();
        await page.keyboard.press('Enter');
        await expect(searchPanel(page)).toHaveAttribute('aria-hidden', 'false');
        await expect(searchPanelInput(page)).toBeVisible();
        await searchPanelInput(page).focus();
        await expect(searchPanelInput(page)).toBeFocused();
        await sideNav(page, 'Vyhľadávanie').click();
        await expect(searchPanel(page)).toHaveAttribute('aria-hidden', 'true');
        expect(page.url()).toBe(source);
        expect(await page.evaluate(() => history.length)).toBe(historyLength);
      }
    });
  }
});
