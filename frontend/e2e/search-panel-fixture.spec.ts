import { expect, test, type Page } from '@playwright/test';
import { initializeSearchContext } from './support/search-country-scroll';
import { openLastAuthor, openReturnFixture, searchPanel } from './support/search-panel-return';

// Harness regressions only, not proof that the pending production panel/return repair is deployed.
// Real Railway GET responses and existing reusable content; no API replacement or content creation.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

// Service worker aplikácie (public/sw.js) preposiela každé volanie /api/ cez vlastný fetch. Také požiadavky
// `page.route` nevidí, takže by strážca zápisov (a simulovaná odpoveď) mlčky nefungoval. Preto sa worker
// v tomto špecu blokuje.
test.use({ serviceWorkers: 'block' });

const SHORT_FIXTURE_MESSAGE = 'Reusable search results must allow more than 250px of scrolling; choose a broader E2E_SEARCH_NAV_QUERY.';

/** Compare the complete local scroll store without exporting account IDs, source URLs, or snapshots. */
async function scrollStoreFingerprint(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const bytes = new TextEncoder().encode(sessionStorage.getItem('svaplySearchScrollV1') || '');
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  });
}

test.describe('Search return harness fixture geometry', () => {
  let attemptedWrites: string[];

  test.beforeEach(async ({ page, baseURL }) => {
    if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
      throw new Error('These tests are restricted to the configured Railway deployment.');
    }
    attemptedWrites = [];
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
    expect(attemptedWrites, 'Fixture checks must not write content or account preferences').toEqual([]);
  });

  for (const tab of ['offers', 'users'] as const) {
    test(`${tab}: short real geometry is rejected before navigation; normal geometry permits deep profile entry`, async ({ page, isMobile }) => {
      await openReturnFixture(page, tab);
      // Explicitly isolate the helper from the old production panel default. Product tests never do this.
      await page.keyboard.press('Escape');
      await expect(searchPanel(page)).toHaveAttribute('aria-hidden', 'true');
      const viewport = page.viewportSize();
      if (!viewport) throw new Error('This fixture regression requires the configured project viewport.');
      await page.setViewportSize({ width: viewport.width, height: 10_000 });
      const main = page.locator('[data-search-scroll-root]');
      const authors = main.locator(tab === 'users'
        ? 'section div[role="button"][tabindex="0"]' : 'button.rounded-t-2xl');
      await expect.poll(() => authors.count(), { message: 'The actual server results must contain an author' })
        .toBeGreaterThan(0);
      await expect.poll(() => main.evaluate((element) => element.scrollHeight - element.clientHeight), {
        message: 'The tall real viewport must produce a genuinely shallow results fixture',
      }).toBeLessThanOrEqual(250);
      const sourceUrl = page.url();
      const before = await scrollStoreFingerprint(page);

      await expect(openLastAuthor(page, tab, isMobile)).rejects.toThrow(SHORT_FIXTURE_MESSAGE);

      expect(page.url() === sourceUrl, 'Insufficient geometry must fail before opening any profile').toBe(true);
      expect(await scrollStoreFingerprint(page), 'A rejected fixture must not write a return snapshot').toBe(before);
      await page.setViewportSize(viewport);
      await expect.poll(() => main.evaluate((element) => element.scrollHeight - element.clientHeight), {
        message: 'The existing reusable results must support deep scrolling at the normal project viewport',
      }).toBeGreaterThan(250);
      const position = await openLastAuthor(page, tab, isMobile);
      expect(position.top).toBeGreaterThan(250);
      await expect(page).toHaveURL(/\/dashboard\/users\/[^/?]+(?:\?|$)/);
    });
  }
});
