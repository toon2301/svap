import { expect, test, type Page, type Response } from '@playwright/test';
import { initializeSearchContext } from './support/search-country-scroll';
import { measureReturn, openLastAuthor, searchPanel } from './support/search-panel-return';

// Real Railway responses and reusable results only. Never record personal-data artifacts or write content.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

// Service worker aplikácie (public/sw.js) preposiela každé volanie /api/ cez vlastný fetch. Také požiadavky
// `page.route` nevidí, takže by strážca zápisov (a simulovaná odpoveď) mlčky nefungoval. Preto sa worker
// v tomto špecu blokuje.
test.use({ serviceWorkers: 'block' });

type PreviewDestination = 'users' | 'offers';
type PreviewProbe = {
  firstCommittedTop: number | null;
  firstCommittedCapacity: number | null;
  serverValidated: boolean;
  readyTop: number | null;
};
type PreviewWindow = Window & { __searchPreviewTabProbe?: PreviewProbe };

/** Observe the first committed destination frame, rather than accepting a late smooth scroll as immediate. */
async function observePreviewTransition(page: Page, destination: string, buttonLabel: string, tab: PreviewDestination): Promise<void> {
  await page.evaluate(({ targetUrl, label, selector }) => {
    const browser = window as PreviewWindow;
    const probe: PreviewProbe = {
      firstCommittedTop: null, firstCommittedCapacity: null, serverValidated: false, readyTop: null,
    };
    browser.__searchPreviewTabProbe = probe;
    /** Keep only numeric geometry; never retain names, cards, profiles, or response payloads. */
    const sample = () => {
      const main = document.querySelector<HTMLElement>('[data-search-scroll-root]');
      const previewStillMounted = main && Array.from(main.querySelectorAll('button'))
        .some((button) => button.textContent?.trim() === label);
      if (window.location.href === targetUrl && main && !previewStillMounted) {
        probe.firstCommittedTop ??= main.scrollTop;
        probe.firstCommittedCapacity ??= Math.max(0, main.scrollHeight - main.clientHeight);
        if (probe.serverValidated && !main.querySelector('[data-search-loading="true"]')
          && main.querySelectorAll(selector).length > 0) probe.readyTop ??= main.scrollTop;
      }
      // Production network latency is not a scroll-reset budget; the test context bounds observation.
      if (probe.readyTop === null) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, {
    targetUrl: destination,
    label: buttonLabel,
    selector: tab === 'users' ? 'section div[role="button"][tabindex="0"]' : 'button.rounded-t-2xl',
  });
}

/** Consume the genuine API response only to a count, without exposing personal result objects in reports. */
async function realResultCount(response: Response, tab: PreviewDestination): Promise<number> {
  expect(response.status(), 'The genuine destination search request must succeed').toBe(200);
  const data: unknown = await response.json();
  const key = tab === 'users' ? 'users' : 'results';
  if (!data || typeof data !== 'object' || !Array.isArray((data as Record<string, unknown>)[key])) {
    throw new Error('The genuine destination search response must contain a valid result collection.');
  }
  return ((data as Record<string, unknown>)[key] as unknown[]).length;
}

test.describe('Search preview Show More starts the selected tab at the top', () => {
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
    expect(attemptedWrites, 'Preview navigation checks must not write content or account preferences').toEqual([]);
  });

  for (const tab of ['users', 'offers'] as const) {
    test(`${tab}: Show More resets nested scroll immediately but profile Back/Forward retains deep position`, async ({ page, isMobile }) => {
      const query = process.env.E2E_SEARCH_NAV_QUERY?.trim() || 'te';
      if (query.length < 2) throw new Error('The existing reusable query must contain at least two characters.');
      const viewport = page.viewportSize();
      if (!viewport) throw new Error('This regression requires the configured project viewport.');
      // A real shorter viewport ensures that the five-user preview button can be clicked below the top.
      await page.setViewportSize({ width: viewport.width, height: 600 });
      const params = new URLSearchParams({ q: query, tab: 'all', sort: 'newest', onlyMyLocation: '0' });
      const initialResponse = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname === '/api/auth/search/global/'
          && url.searchParams.get('q') === query && url.searchParams.get('include_offers') === 'true';
      });
      await page.goto(`/search?${params}`);
      expect((await initialResponse).status()).toBe(200);
      await expect(page.locator('[data-onboarding="search-input"] input').first()).toBeAttached();
      await expect(searchPanel(page)).toHaveAttribute('aria-hidden', 'true');
      const main = page.locator('[data-search-scroll-root]');
      await expect(main.locator('[data-search-loading="true"]')).toHaveCount(0);
      const label = tab === 'users' ? 'Zobraziť viac ľudí' : 'Zobraziť viac ponúk';
      const button = main.getByRole('button', { name: label, exact: true });
      await expect(button, 'The existing reusable query must provide the actual Show More preview action').toBeVisible();
      if (isMobile) {
        // WebKit touch projects do not implement mouse wheel; move the actual unmodified scroller instead.
        await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
      } else {
        await main.hover();
        await page.mouse.wheel(0, 10_000);
      }
      await expect.poll(() => main.evaluate(async (element) => {
        const before = element.scrollTop;
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        return Math.abs(element.scrollTop - before) < 0.5;
      }), { message: 'Real scroller movement must settle before positioning the actual preview button' }).toBe(true);
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport();
      const beforeTop = await main.evaluate((element) => element.scrollTop);
      expect(beforeTop, 'The real click must start below the top, not from an already reset fixture').toBeGreaterThan(0);

      const expected = new URL(page.url());
      expected.searchParams.set('tab', tab);
      if (tab === 'users') expected.searchParams.delete('users_page');
      else expected.searchParams.set('page', '1');
      const historyLength = await page.evaluate(() => history.length);
      await observePreviewTransition(page, expected.href, label, tab);
      const [response] = await Promise.all([
        page.waitForResponse((candidate) => {
          const url = new URL(candidate.url());
          return candidate.request().method() === 'GET' && url.searchParams.get('q') === query
            && (tab === 'offers' ? url.pathname === '/api/auth/search/'
              : url.pathname === '/api/auth/search/global/' && url.searchParams.get('include_offers') === 'false');
        }),
        isMobile ? button.tap() : button.click(),
      ]);
      const count = await realResultCount(response, tab);
      expect(count, 'The destination must contain real reusable results, not an empty-state scroll clamp').toBeGreaterThan(0);
      // The UI excludes the viewer's own cards, so its rendered count need not equal the raw response count.
      await page.evaluate(() => { (window as PreviewWindow).__searchPreviewTabProbe!.serverValidated = true; });
      await expect(page).toHaveURL(expected.href);
      await expect.poll(() => page.evaluate(() => (window as PreviewWindow).__searchPreviewTabProbe?.readyTop != null), {
        message: 'Wait for real destination results rather than accepting skeleton or empty-list geometry',
      }).toBe(true);
      const positions = await page.evaluate(() => {
        const probe = (window as PreviewWindow).__searchPreviewTabProbe!;
        return { first: probe.firstCommittedTop, capacity: probe.firstCommittedCapacity, ready: probe.readyTop };
      });
      expect(positions.capacity, 'The first destination frame must remain scrollable; zero-capacity clamping cannot prove an explicit reset')
        .not.toBeNull();
      expect(positions.capacity!).toBeGreaterThan(0);
      expect(positions.first, 'The first committed destination frame must already start at the top').not.toBeNull();
      expect(positions.first!).toBeLessThanOrEqual(2);
      expect(positions.ready, 'Real loaded results must remain at the top').not.toBeNull();
      expect(positions.ready!).toBeLessThanOrEqual(2);
      expect(await page.evaluate(() => history.length)).toBe(historyLength);
      await expect.poll(() => main.evaluate((element) => element.scrollHeight - element.clientHeight), {
        message: 'Real destination results must support deep scrolling; a short list is not proof of a reset',
      }).toBeGreaterThan(250);
      expect(await main.evaluate((element) => element.scrollTop)).toBeLessThanOrEqual(2);

      const position = await openLastAuthor(page, tab, isMobile);
      await measureReturn(page, position, () => page.goBack());
      await page.goForward();
      await expect(page).toHaveURL(/\/dashboard\/users\/[^/?]+(?:\?|$)/);
      await measureReturn(page, position, () => page.goBack());
    });
  }
});
