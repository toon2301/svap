import { expect, test } from '@playwright/test';
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
} from './support/search-country-scroll';

// Railway only; genuine GET responses and reusable content, with no personal-data artifacts.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

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
});
