import { expect, test } from '@playwright/test';
import { sideNav } from './support/dashboard';
import {
  DIAGNOSTICS_LABEL,
  diagnosticValue,
  expectRestoredSearch,
  initializeSearchContext,
  isPanelSearch,
  openDeepResultAuthor,
  openInitialSearch,
  openScrollableResults,
  panelSummary,
  savedSearchScrollId,
  savedSearchScrollTop,
} from './support/search-country-scroll';

// Railway only; genuine GET responses and reusable content, with no personal-data artifacts.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

// Service worker aplikácie (public/sw.js) preposiela každé volanie /api/ cez vlastný fetch. Také požiadavky
// `page.route` nevidí, takže by strážca zápisov (a simulovaná odpoveď) mlčky nefungoval. Preto sa worker
// v tomto špecu blokuje.
test.use({ serviceWorkers: 'block' });

test.describe('OW-18 independent search country and OW-19 result return position', () => {
  let attemptedWrites: string[];

  test.beforeEach(async ({ page, baseURL }) => {
    if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
      throw new Error('These tests are restricted to the configured Railway deployment.');
    }
    attemptedWrites = [];
    await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
      const request = route.request();
      const sessionRefresh = ['/api/token/refresh/', '/api/auth/token/refresh/']
        .includes(new URL(request.url()).pathname);
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || sessionRefresh) {
        await route.continue();
      } else {
        attemptedWrites.push(request.method());
        await route.abort();
      }
    });
  });

  test.afterEach(() => {
    expect(attemptedWrites, 'Search regressions must not write content, settings, likes, hints, requests, or messages')
      .toEqual([]);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: Enter sends IP country SK despite a saved manual offer preference CZ`, async ({ page, isMobile }) => {
      await initializeSearchContext(page, theme);
      const input = await openInitialSearch(page, isMobile);
      const query = 'MoNiToRoVaNiE';
      const response = page.waitForResponse((candidate) => isPanelSearch(candidate.request(), query));
      await input.fill(query);
      await input.press('Enter');
      const actual = await panelSummary(await response);
      expect(actual.country, 'Form preferences must not choose the country sent by search').toBe('SK');
      const region = page.getByRole('region', { name: DIAGNOSTICS_LABEL, exact: true });
      await expect(diagnosticValue(region, 'Aktuálna krajina vyhľadávania')).toHaveText('SK');
      await expect(diagnosticValue(region, 'Krajina filtra')).toHaveText('SK');
      await expect(diagnosticValue(region, 'Odoslaná krajina')).toHaveText('SK');
      await expect(diagnosticValue(region, 'Uložená ručná voľba krajiny')).toHaveText('CZ');
      await expect(diagnosticValue(region, 'HTTP stav')).toHaveText('200');
      await expect(diagnosticValue(region, 'Počet vrátených kariet')).toHaveText(String(actual.count));
      expect(await page.evaluate(() => localStorage.getItem('appLastManualOfferCountryV1'))).toBe('CZ');
      await expect.poll(() => page.locator('html').evaluate((html) => html.classList.contains('dark')))
        .toBe(theme === 'dark');
    });

    for (const tab of ['all', 'offers'] as const) {
      test(`${theme}: ${tab} retains URL and deep nested scroll after browser Back and mobile app Back`, async ({ page, isMobile }) => {
        await initializeSearchContext(page, theme);
        const source = await openScrollableResults(page, tab);
        const top = await openDeepResultAuthor(page, isMobile);
        await page.goBack();
        await expectRestoredSearch(page, source, top);
        if (isMobile) {
          const secondTop = await openDeepResultAuthor(page, true);
          await page.getByRole('button', { name: 'Späť', exact: true }).filter({ visible: true }).first().tap();
          await expectRestoredSearch(page, source, secondTop);
        }
        await expect.poll(() => page.locator('html').evaluate((html) => html.classList.contains('dark')))
          .toBe(theme === 'dark');
      });
    }
  }

  test('typing alone automatically searches, without Enter, and uses the independent IP country', async ({ page, isMobile }) => {
    await initializeSearchContext(page, 'light');
    const input = await openInitialSearch(page, isMobile);
    const response = page.waitForResponse((candidate) => isPanelSearch(candidate.request(), 'Mo'));
    await input.pressSequentially('Mo');
    // No Enter/click/reload fallback: this deliberately covers the previously untested auto-search path.
    const actual = await panelSummary(await response);
    expect(actual.country).toBe('SK');
    const region = page.getByRole('region', { name: DIAGNOSTICS_LABEL, exact: true });
    await expect(diagnosticValue(region, 'HTTP stav')).toHaveText('200');
    await expect(diagnosticValue(region, 'Krajina filtra')).toHaveText('SK');
  });

  test('review: a trailing-slash search entry retains its URL and scroll through an author roundtrip', async ({ page, isMobile }) => {
    await initializeSearchContext(page, 'light');
    const source = await openScrollableResults(page, 'offers', '/search/');
    expect(new URL(source).pathname).toBe('/search/');
    const top = await openDeepResultAuthor(page, isMobile);
    await page.goBack();
    await expectRestoredSearch(page, source, top);
  });

  test('review: a restored profile-return snapshot follows user scrolling before ordinary departure and Back', async ({ page, isMobile }) => {
    await initializeSearchContext(page, 'dark');
    const source = await openScrollableResults(page, 'offers');
    const top = await openDeepResultAuthor(page, isMobile);
    const snapshotId = await savedSearchScrollId(page, source, top);
    expect(Boolean(snapshotId), 'Opening the author must create a bounded profile-return attempt').toBe(true);
    await page.goBack();
    await expectRestoredSearch(page, source, top);

    const main = page.locator('[data-dashboard-main]');
    await main.hover();
    // Real wheel input moves the nested scroller; no synthetic scroll event or direct scroll assignment.
    await page.mouse.wheel(0, -700);
    await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBeLessThan(top - 100);
    await expect.poll(() => main.evaluate(async (element) => {
      const before = element.scrollTop;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      return Math.abs(element.scrollTop - before) < 0.5;
    }), { message: 'The real wheel movement must settle before its final position is compared' }).toBe(true);
    const latestTop = await main.evaluate((element) => Math.round(element.scrollTop));
    await expect.poll(() => savedSearchScrollTop(page, snapshotId!)).toBe(latestTop);
    if (isMobile) {
      // Full search has no mobile sidebar: use its actual visible, non-profile departure instead.
      await page.getByRole('button', { name: 'Späť', exact: true }).filter({ visible: true }).first().tap();
      await expect(page).toHaveURL(/\/dashboard\/search(?:[?#]|$)/);
    } else {
      await sideNav(page, 'Nástenka').click();
      await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/);
    }
    await page.goBack();
    await expectRestoredSearch(page, source, latestTop);
  });
});
