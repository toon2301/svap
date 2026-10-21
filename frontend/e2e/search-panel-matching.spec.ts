import { expect, test } from '@playwright/test';
import { initializeSearchContext, openInitialSearch } from './support/search-country-scroll';
import {
  configurePanel, descriptionOnlyFixture, expectPanelParity, searchPanelEvidence, viewerQuery,
} from './support/search-panel-matching';

// Genuine Railway GET responses and existing content only. These checks do not create cards, open profiles,
// update account preferences, replace server responses, or claim full-page filter parity (the next stage).
test.use({ trace: 'off', screenshot: 'off', video: 'off', serviceWorkers: 'block' });

test.describe('Initial search panel matching and visible-result consistency', () => {
  let attemptedWrites: string[];

  test.beforeEach(async ({ page, baseURL }) => {
    if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
      throw new Error('These tests are restricted to the configured Railway deployment.');
    }
    attemptedWrites = [];
    await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
      const request = route.request();
      const refresh = request.method() === 'POST'
        && ['/api/token/refresh/', '/api/auth/token/refresh/'].includes(new URL(request.url()).pathname);
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || refresh) await route.continue();
      else { attemptedWrites.push(request.method()); await route.abort(); }
    });
  });

  test.afterEach(() => {
    expect(attemptedWrites, 'Search matching checks must not write application content or account preferences').toEqual([]);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: offers and seeking cards match genuine HTTP results; checkboxes govern the list and CTA together`, async ({ page, isMobile }) => {
      await initializeSearchContext(page, theme);
      const input = await openInitialSearch(page, isMobile);
      const query = process.env.E2E_SEARCH_NAV_QUERY?.trim() || 'te';
      if (query.length < 2) throw new Error('The existing broad fixture query must contain at least two characters.');
      for (const type of ['offer', 'seeking'] as const) {
        for (const groups of [
          { skills: true, users: true }, { skills: true, users: false },
          { skills: false, users: true }, { skills: false, users: false },
        ]) {
          await configurePanel(page, input, type, groups);
          const result = await searchPanelEvidence(page, input, query, type);
          expect(result.skills, 'The existing broad query must include reusable content of each selected card type').toBeGreaterThan(0);
          expect(type === 'offer' ? result.allOffers : result.allSeeking, 'The server must enforce the selected card type').toBe(true);
          await expectPanelParity(input, result, groups);
        }
      }
      expect(await page.locator('html').evaluate((element) => element.classList.contains('dark'))).toBe(theme === 'dark');
    });
  }

  test('an existing description-only match is present in the genuine panel response and rendered list', async ({ page, isMobile }) => {
    await initializeSearchContext(page, 'light');
    const input = await openInitialSearch(page, isMobile);
    const fixture = await descriptionOnlyFixture(page);
    const groups = { skills: true, users: false };
    await configurePanel(page, input, fixture.type, groups);
    const result = await searchPanelEvidence(page, input, fixture.query, fixture.type, fixture.id);
    expect(result.includesFixture, 'A query present only in an existing description must find that same card').toBe(true);
    await expectPanelParity(input, result, groups);
  });

  test('a genuine hidden-user-only response shows empty state without advertising view-all', async ({ page, isMobile }) => {
    await initializeSearchContext(page, 'dark');
    const input = await openInitialSearch(page, isMobile);
    const viewer = await viewerQuery(page);
    const groups = { skills: true, users: false };
    await configurePanel(page, input, 'all', groups);
    const result = await searchPanelEvidence(page, input, viewer.query, 'all', undefined, viewer.id);
    expect(result.skills, 'The existing account username must provide a genuine user-only fixture').toBe(0);
    expect(result.users).toBeGreaterThan(0);
    expect(result.includesViewer, 'The server must return the authenticated account for its existing username').toBe(true);
    await expectPanelParity(input, result, groups);
  });
});
