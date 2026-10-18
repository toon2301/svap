import { expect, type Locator, type Page } from '@playwright/test';

export type ResultsTab = 'all' | 'offers' | 'users';
export type ResultPosition = {
  url: string;
  top: number;
  width: number;
  count: number;
  tab: ResultsTab;
};
type ReturnTiming = {
  readyAt: number | null;
  restoredAt: number | null;
  panelOpened: boolean;
};
type ProbeWindow = Window & { __searchReturnTimings?: Record<string, ReturnTiming> };
type ReturnProbe = { id: string; url: string; top: number; count: number; selector: string };

/** This function is serialized into each browser document; it must have no runtime module dependencies. */
function installReturnProbe({ id, url, top, count, selector }: ReturnProbe): void {
  const target = window as ProbeWindow;
  target.__searchReturnTimings ??= {};
  if (target.__searchReturnTimings[id]) return;
  const timing: ReturnTiming = { readyAt: null, restoredAt: null, panelOpened: false };
  target.__searchReturnTimings[id] = timing;
  const started = performance.now();
  const sample = () => {
    const main = document.querySelector<HTMLElement>('[data-search-scroll-root]');
    if (window.location.href === url && main?.previousElementSibling?.getAttribute('aria-hidden') === 'false') {
      timing.panelOpened = true;
    }
    if (window.location.href === url && main && !main.querySelector('[data-search-loading="true"]')
      && main.querySelectorAll(selector).length >= count) {
      timing.readyAt ??= performance.now();
      if (Math.abs(main.scrollTop - top) <= 2) timing.restoredAt ??= performance.now();
    }
    if (timing.restoredAt === null && performance.now() - started < 20_000) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}

export function searchPanel(page: Page): Locator {
  return page.locator('[data-search-scroll-root]')
    .locator('xpath=preceding-sibling::div[@aria-hidden][1]');
}

export function searchPanelInput(page: Page): Locator {
  return page.locator('[data-onboarding="search-input"] input').filter({ visible: true });
}

function resultSelector(tab: ResultsTab): string {
  return tab === 'users' ? 'section div[role="button"][tabindex="0"]' : 'button.rounded-t-2xl';
}

/** Read only real reusable results; absent fixtures fail rather than becoming skipped passes. */
export async function openReturnFixture(page: Page, tab: ResultsTab): Promise<void> {
  const query = process.env.E2E_SEARCH_NAV_QUERY?.trim() || 'te';
  if (query.length < 2) throw new Error('The existing reusable query must contain at least two characters.');
  const path = tab === 'offers' ? '/api/auth/search/' : '/api/auth/search/global/';
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === path && url.searchParams.get('q') === query;
  });
  await page.goto(`/search?${new URLSearchParams({ q: query, tab })}`);
  expect((await responsePromise).status(), 'The real results request must succeed').toBe(200);
  // A hidden panel input is mounted only after the authenticated viewer has loaded.
  await expect(page.locator('[data-onboarding="search-input"] input').first()).toBeAttached();
  const main = page.locator('[data-search-scroll-root]');
  await expect(main.locator('[data-search-loading="true"]')).toHaveCount(0);
  await expect.poll(() => main.locator(resultSelector(tab)).count(), {
    message: 'Existing reusable results must support a genuine profile-return scenario',
  }).toBeGreaterThanOrEqual(3);
}

/** Capture the geometry the actual author click must retain, without manufacturing history metadata. */
export async function openLastAuthor(page: Page, tab: ResultsTab, isMobile: boolean): Promise<ResultPosition> {
  const main = page.locator('[data-search-scroll-root]');
  const authors = main.locator(resultSelector(tab));
  const author = authors.last();
  await author.scrollIntoViewIfNeeded();
  const geometry = await main.evaluate((element) => ({
    top: Math.round(element.scrollTop), width: element.clientWidth,
  }));
  expect(geometry.top, 'Use real deep results so changed panel geometry cannot hide a broken restore')
    .toBeGreaterThan(250);
  const position = { url: page.url(), ...geometry, count: await authors.count(), tab };
  if (isMobile) await author.tap();
  else await author.click();
  await expect(page).toHaveURL(/\/dashboard\/users\/[^/?]+(?:\?|$)/);
  const captured = await page.evaluate(({ url, top }) => {
    const entries: unknown = JSON.parse(sessionStorage.getItem('svaplySearchScrollV1') || '[]');
    const parsed = new URL(url);
    return Array.isArray(entries) && entries.some((entry) => entry?.url === `${parsed.pathname}${parsed.search}`
      && typeof entry.top === 'number' && Math.abs(entry.top - top) <= 2);
  }, position);
  expect(captured, 'A real author click must save the source position before measuring restoration').toBe(true);
  return position;
}

/** Observe real DOM readiness and each animation frame, never hide a six-second delay in a loose final poll. */
export async function measureReturn(page: Page, position: ResultPosition, navigateBack: () => Promise<unknown>): Promise<void> {
  const probe = { ...position, id: Math.random().toString(36).slice(2), selector: resultSelector(position.tab) };
  // Cover same-document Next navigation AND fresh-document Back; IDs isolate repeated mobile returns.
  await page.addInitScript(installReturnProbe, probe);
  await page.evaluate(installReturnProbe, probe);
  await navigateBack();
  await expect(page).toHaveURL(position.url);
  // A bfcache-restored document can predate addInitScript. Install only if that document lacks this ID;
  // never reset an early readiness timestamp already collected in the same or a fresh document.
  await page.evaluate(installReturnProbe, probe);
  await expect.poll(() => page.evaluate((id) => (window as ProbeWindow).__searchReturnTimings?.[id]?.readyAt != null, probe.id), {
    message: 'Wait for genuine rendered results, not skeleton geometry or an arbitrary network deadline',
    timeout: 15_000,
  }).toBe(true);
  const elapsed = await page.evaluate(async (id) => {
    const timing = (window as ProbeWindow).__searchReturnTimings![id];
    // The budget starts only after real data is present, independent of production network latency.
    while (timing.restoredAt === null && performance.now() - timing.readyAt! < 1500) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return timing.restoredAt === null ? null : timing.restoredAt - timing.readyAt!;
  }, probe.id);
  expect(elapsed, 'The ready results must not remain at the top until the six-second restore timeout')
    .not.toBeNull();
  expect(elapsed!).toBeLessThan(1500);
  expect(await page.evaluate((id) => (window as ProbeWindow).__searchReturnTimings?.[id]?.panelOpened, probe.id),
    'The search panel must not open even temporarily during the return').toBe(false);
  await expect(searchPanel(page)).toHaveAttribute('aria-hidden', 'true');
  await expect.poll(() => page.locator('[data-search-scroll-root]').evaluate((element) => element.clientWidth))
    .toBe(position.width);
  await expect.poll(() => page.locator('[data-search-scroll-root]').evaluate((element) => Math.abs(element.scrollTop - position.top)))
    .toBeLessThanOrEqual(2);
}
