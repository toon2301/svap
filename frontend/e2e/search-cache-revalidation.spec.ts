import { expect, test, type APIResponse, type Locator, type Page, type Request, type Response, type Route } from '@playwright/test';
import {
  DIAGNOSTICS_LABEL, SEARCH_PATH, diagnosticValue, initializeSearchContext, isPanelSearch, openInitialSearch,
} from './support/search-country-scroll';

// Railway only. Block service workers so every API request reaches the read-only guard and genuine-response barrier.
// This tests the application result cache, not offline/service-worker behavior or a physical installed PWA.
test.use({ trace: 'off', screenshot: 'off', video: 'off', serviceWorkers: 'block' });

type Counts = { skills: number; users: number; status: number };
type HeldResponse = {
  requests: number;
  sameParameters: boolean;
  phase: 'waiting' | 'held' | 'failed';
  counts: Counts | null;
  done: boolean;
  browserSettled: boolean;
};
type HistoryWindow = Window & {
  __ow20HistoryWrites?: number;
  __ow20OriginalSetItem?: typeof Storage.prototype.setItem;
};
const EMPTY_QUERY = 'xyzabc123ow20';
const EMPTY_COPY = 'Pre zadané vyhľadávanie sa nenašli žiadne výsledky.';

/** Require an existing broad query, never create content or skip a missing reusable fixture. */
function previewQuery(): string {
  const query = process.env.E2E_SEARCH_NAV_QUERY?.trim() || 'te';
  if (query.length < 2) throw new Error('The existing reusable query must contain at least two characters.');
  return query;
}

/** Reduce the real response to aggregate counts before any assertion can expose result objects. */
async function responseCounts(response: APIResponse | Response): Promise<Counts> {
  const status = response.status();
  if (status !== 200) throw new Error(`Genuine dashboard search failed: HTTP ${status}.`);
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('skills' in data) || !('users' in data)
    || !Array.isArray(data.skills) || !Array.isArray(data.users)) {
    throw new Error('Genuine dashboard search returned invalid result collections.');
  }
  return { skills: data.skills.length, users: data.users.length, status };
}

/** Observe identical parameters and delay only delivery of the second unchanged real server response. */
async function holdSecondResponse(page: Page, query: string) {
  const state: HeldResponse = {
    requests: 0, sameParameters: false, phase: 'waiting', counts: null, done: false, browserSettled: false,
  };
  let firstParameters: string | null = null;
  let secondRequest: Request | null = null;
  let release!: () => void;
  let finish!: () => void;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const finished = new Promise<void>((resolve) => { finish = resolve; });
  const matches = (url: URL) => url.pathname === SEARCH_PATH && url.searchParams.get('q') === query;
  /** Record transport completion without logging request URLs or response contents. */
  const settled = (request: Request) => { if (request === secondRequest) state.browserSettled = true; };
  page.on('requestfinished', settled);
  page.on('requestfailed', settled);
  /** Forward the actual GET, holding only its unchanged response so pending UI is deterministically observable. */
  const handler = async (route: Route) => {
    if (route.request().method() !== 'GET') { await route.fallback(); return; }
    state.requests += 1;
    const url = new URL(route.request().url());
    url.searchParams.sort();
    const parameters = url.searchParams.toString();
    if (state.requests === 1) firstParameters = parameters;
    if (state.requests !== 2) { await route.continue(); return; }
    state.sameParameters = parameters === firstParameters;
    secondRequest = route.request();
    let actual: APIResponse | null = null;
    try {
      actual = await route.fetch();
      state.counts = await responseCounts(actual);
      state.phase = 'held';
      await barrier;
      // Cancellation after clearing the input may legitimately make delivery impossible.
      try { await route.fulfill({ response: actual }); } catch { /* The browser may have aborted this GET. */ }
    } catch {
      state.phase = 'failed';
      try { await route.abort(); } catch { /* A closing test context may already have cancelled it. */ }
    } finally {
      try { await actual?.dispose(); } catch { /* Disposal must remain safe after browser cancellation. */ }
      state.done = true;
      finish();
    }
  };
  await page.route(matches, handler);
  return {
    state,
    release,
    /** Always release a held response before removing its route, including expected old-production failures. */
    async cleanup() {
      release();
      if (secondRequest) await finished;
      await page.unroute(matches, handler);
      page.off('requestfinished', settled);
      page.off('requestfailed', settled);
    },
  };
}

/** Observe confirmed server completion through the existing opt-in diagnostics, without relying on personal labels. */
async function expectCompleted(page: Page, counts: Counts): Promise<void> {
  const diagnostics = page.getByRole('region', { name: DIAGNOSTICS_LABEL, exact: true });
  await expect(diagnosticValue(diagnostics, 'Zdroj výsledku')).toHaveText('Sieť');
  await expect(diagnosticValue(diagnostics, 'HTTP stav')).toHaveText('200');
  await expect(diagnosticValue(diagnostics, 'Počet vrátených kariet')).toHaveText(String(counts.skills));
  await expect(diagnosticValue(diagnostics, 'Počet vrátených používateľov')).toHaveText(String(counts.users));
}

/** Start a fresh real query through the public input, avoiding an unhandled response observer on input failure. */
async function prime(page: Page, input: Locator, query: string): Promise<Counts> {
  await expect(input).toBeVisible();
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => isPanelSearch(candidate.request(), query)),
    (async () => { await input.fill(query); await input.press('Enter'); })(),
  ]);
  const counts = await responseCounts(response);
  await expectCompleted(page, counts);
  return counts;
}

/** Compare full recent-result storage without exporting identities, queries, or stored result payloads. */
async function historyEvidence(page: Page): Promise<{ fingerprint: string; writes: number }> {
  return page.evaluate(async () => {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith('searchRecentResults_')).sort();
    const stored = JSON.stringify(keys.map((key) => [key, localStorage.getItem(key)]));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stored));
    return {
      fingerprint: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''),
      writes: (window as HistoryWindow).__ow20HistoryWrites ?? 0,
    };
  });
}

/** Count writes observationally while leaving the native storage operation and payload completely unchanged. */
async function observeHistoryWrites(page: Page): Promise<void> {
  await page.evaluate(() => {
    const browser = window as HistoryWindow;
    const original = Storage.prototype.setItem;
    browser.__ow20OriginalSetItem = original;
    browser.__ow20HistoryWrites = 0;
    Storage.prototype.setItem = function observedSetItem(key: string, value: string) {
      if (this === localStorage && String(key).startsWith('searchRecentResults_')) browser.__ow20HistoryWrites! += 1;
      return original.call(this, key, value);
    };
  });
}

test.describe('OW-20 real search cache revalidation', () => {
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
      else { attemptedWrites.push(request.method()); await route.abort(); }
    });
  });

  test.afterEach(async ({ page }) => {
    expect(attemptedWrites, 'Cache checks must not write application content or preferences').toEqual([]);
    await page.evaluate(() => {
      const browser = window as HistoryWindow;
      if (browser.__ow20OriginalSetItem) Storage.prototype.setItem = browser.__ow20OriginalSetItem;
    });
  });

  test('an identical repeat sends real HTTP while retaining the existing preview and exposing revalidation', async ({ page, isMobile }) => {
    const input = await openInitialSearch(page, isMobile);
    const query = previewQuery();
    const held = await holdSecondResponse(page, query);
    try {
      const first = await prime(page, input, query);
      expect(first.skills, 'The existing reusable query must provide a nonempty card preview').toBeGreaterThan(0);
      const aside = input.locator('xpath=ancestor::aside[1]');
      const badges = aside.locator('span').filter({ hasText: /^(?:PONÚKAM|HĽADÁM)$/ });
      await expect(badges).toHaveCount(first.skills);
      await input.press('Enter');
      await expect.poll(() => held.state.phase, { message: 'An identical cached query must issue and complete a second real server GET' }).toBe('held');
      expect(held.state.requests).toBe(2);
      expect(held.state.sameParameters, 'Revalidation must use exactly the same query and filter parameters').toBe(true);
      await expect(aside.locator('[role="status"][data-search-revalidating="true"]')).toBeVisible();
      await expect(aside.locator('[aria-busy="true"]')).toHaveCount(1);
      await expect(badges).toHaveCount(first.skills);
      await expect(aside.getByText(EMPTY_COPY, { exact: true })).toHaveCount(0);
      const [response] = await Promise.all([
        page.waitForResponse((candidate) => isPanelSearch(candidate.request(), query)),
        Promise.resolve().then(held.release),
      ]);
      const second = await responseCounts(response);
      expect(second).toEqual(held.state.counts);
      await expectCompleted(page, second);
      await expect(aside.locator('[data-search-revalidating="true"]')).toHaveCount(0);
      await expect(badges).toHaveCount(second.skills);
    } finally { await held.cleanup(); }
  });

  test('an identical cached empty result is revalidated and is not presented as final while pending', async ({ page, isMobile }) => {
    const input = await openInitialSearch(page, isMobile);
    const held = await holdSecondResponse(page, EMPTY_QUERY);
    try {
      const first = await prime(page, input, EMPTY_QUERY);
      expect(first, 'The existing none-match query must genuinely return no results').toEqual({ skills: 0, users: 0, status: 200 });
      const aside = input.locator('xpath=ancestor::aside[1]');
      await expect(aside.getByText(EMPTY_COPY, { exact: true })).toBeVisible();
      await input.press('Enter');
      await expect.poll(() => held.state.phase, { message: 'Even a cached empty result must be checked against the real server' }).toBe('held');
      expect(held.state.sameParameters).toBe(true);
      await expect(aside.getByRole('status').filter({ hasText: 'Načítavam výsledky...' })).toBeVisible();
      await expect(aside.getByText(EMPTY_COPY, { exact: true })).toHaveCount(0);
      const [response] = await Promise.all([
        page.waitForResponse((candidate) => isPanelSearch(candidate.request(), EMPTY_QUERY)),
        Promise.resolve().then(held.release),
      ]);
      const second = await responseCounts(response);
      expect(second).toEqual({ skills: 0, users: 0, status: 200 });
      expect(held.state.requests).toBe(2);
      await expectCompleted(page, second);
      await expect(aside.getByText(EMPTY_COPY, { exact: true })).toBeVisible();
    } finally { await held.cleanup(); }
  });

  test('clearing the input rejects a held real response without restoring results or writing recent history', async ({ page, isMobile }) => {
    const input = await openInitialSearch(page, isMobile);
    const query = previewQuery();
    const held = await holdSecondResponse(page, query);
    try {
      const first = await prime(page, input, query);
      expect(first.skills).toBeGreaterThan(0);
      await input.press('Enter');
      await expect.poll(() => held.state.phase, { message: 'The stale-response check requires an actual in-flight revalidation' }).toBe('held');
      await observeHistoryWrites(page);
      const before = await historyEvidence(page);
      const aside = input.locator('xpath=ancestor::aside[1]');
      const clear = aside.getByRole('button', { name: 'Vyčistiť vyhľadávanie', exact: true });
      if (isMobile) await clear.tap();
      else await clear.click();
      await expect(input).toHaveValue('');
      // Recent groups/recommendations are legitimate after clearing; only the active results block must disappear.
      await expect(aside.locator('div.mt-4.space-y-1')).toHaveCount(0);
      await expect(aside.locator('[data-search-revalidating="true"]')).toHaveCount(0);
      held.release();
      await expect.poll(() => held.state.done && held.state.browserSettled, {
        message: 'The held transport must finish or be cancelled before checking for forbidden stale commits',
      }).toBe(true);
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      });
      await expect(input).toHaveValue('');
      await expect(aside.locator('div.mt-4.space-y-1')).toHaveCount(0);
      await expect(aside.getByRole('button', { name: 'Zobraziť všetko', exact: true })).toHaveCount(0);
      expect(await historyEvidence(page), 'Cancelled search work must not change or rewrite recent result history')
        .toEqual(before);
    } finally { await held.cleanup(); }
  });
});
