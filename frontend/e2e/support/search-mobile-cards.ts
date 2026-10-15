import { expect, test, type Locator, type Page, type Response } from '@playwright/test';

export type SearchTab = 'all' | 'offers';
type Candidate = { id: number; isSeeking: boolean; hasBusinessHours: boolean };
export type SearchCardFixture = { query: string; index: number; id: number; isSeeking: boolean };

/** Identify search offer wrappers through their existing author header, not personal text. */
export function searchOfferCards(page: Page): Locator {
  return page.locator('[data-dashboard-main] button.rounded-t-2xl').locator('..');
}

/** Reuse the real profile detail sheet without adding a test-only production selector. */
export function searchDetailSheet(page: Page): Locator {
  return page.locator('div.fixed.inset-x-0.bottom-0').filter({
    has: page.getByRole('heading', { level: 2, name: 'Popis', exact: true }),
  });
}

/** Strip API responses down to structural card metadata before returning it to test diagnostics. */
function candidatesFrom(data: unknown, tab: SearchTab, ownId: number): Candidate[] {
  const raw = data && typeof data === 'object'
    ? (data as Record<string, unknown>)[tab === 'all' ? 'offers' : 'results'] : null;
  if (!Array.isArray(raw) || raw.some((item) => (
    !item || typeof item !== 'object' || !Number.isSafeInteger(item.id) || item.id < 1
    || typeof item.is_seeking !== 'boolean'
  ))) throw new Error('Search returned an invalid existing-card collection.');
  return raw.filter((item) => item.user_id !== ownId).map((item) => ({
    id: item.id,
    isSeeking: item.is_seeking,
    hasBusinessHours: Boolean(item.owner_user_type === 'company' && item.opening_hours
      && typeof item.opening_hours === 'object'
      && Object.values(item.opening_hours).some((day) => (
        day && typeof day === 'object' && 'enabled' in day && day.enabled === true
      ))),
  }));
}

/** Read only reusable query terms and the authenticated ID; never log profile/watch bodies. */
async function queryFixtures(page: Page): Promise<{ ownId: number; queries: string[] }> {
  await page.goto('/dashboard');
  await expect(page.getByTestId('feed-list')).toBeVisible();
  const configuredQuery = process.env.E2E_SEARCH_NAV_QUERY;
  if (configuredQuery !== undefined && configuredQuery.trim().length < 2) {
    throw new Error('E2E_SEARCH_NAV_QUERY must contain at least two characters.');
  }
  const result = await page.evaluate(async (configured) => {
    const ownResponse = await fetch('/api/auth/me/', { credentials: 'include' });
    const own = await ownResponse.json().catch(() => null);
    const watchResponse = configured === null
      ? await fetch('/api/auth/offer-watches/', { credentials: 'include' }) : null;
    const watches = watchResponse ? await watchResponse.json().catch(() => null) : [];
    const queries = Array.isArray(watches) ? watches
      .map((watch) => typeof watch?.subcategory === 'string' ? watch.subcategory.trim() : '')
      .filter((query) => query.length >= 2) : [];
    return {
      ownStatus: ownResponse.status,
      ownId: Number.isSafeInteger(own?.id) && own.id > 0 ? own.id as number : null,
      watchesStatus: watchResponse?.status ?? 200,
      validWatches: Array.isArray(watches),
      queries: configured === null ? [...new Set([...queries.slice(0, 3), 'te'])] : [configured],
    };
  }, configuredQuery?.trim() ?? null);
  if (result.ownStatus !== 200 || result.ownId === null) {
    throw new Error(`Reading the authenticated fixture failed: HTTP ${result.ownStatus}.`);
  }
  if (result.watchesStatus !== 200 || !result.validWatches) {
    throw new Error(`Reading existing query fixtures failed: HTTP ${result.watchesStatus}.`);
  }
  return { ownId: result.ownId, queries: result.queries };
}

/** Match only the app's genuine search request for the chosen route/query. */
function isSearchResponse(response: Response, tab: SearchTab, query: string): boolean {
  const url = new URL(response.url());
  return response.request().method() === 'GET'
    && url.pathname === (tab === 'all' ? '/api/auth/search/global/' : '/api/auth/search/')
    && url.searchParams.get('q') === query;
}

/** Navigate the real search page and reuse the first visible fixture of the requested kind. */
export async function openSearchFixtureOrSkip(
  page: Page,
  tab: SearchTab,
  isSeeking?: boolean,
  requireBusinessHours = false,
): Promise<SearchCardFixture> {
  const { ownId, queries } = await queryFixtures(page);
  for (const query of queries) {
    const responsePromise = page.waitForResponse((response) => isSearchResponse(response, tab, query));
    await page.goto(`/search?q=${encodeURIComponent(query)}&tab=${tab}`);
    const response = await responsePromise;
    if (response.status() !== 200) throw new Error(`Reading real search results failed: HTTP ${response.status()}.`);
    const candidates = candidatesFrom(await response.json(), tab, ownId).slice(0, tab === 'all' ? 9 : 12);
    const index = candidates.findIndex((candidate) => (
      (isSeeking === undefined || candidate.isSeeking === isSeeking)
      && (!requireBusinessHours || candidate.hasBusinessHours)
    ));
    if (index !== -1) {
      await expect(searchOfferCards(page)).toHaveCount(candidates.length);
      await expect(searchOfferCards(page).nth(index)).toBeVisible();
      return { query, index, id: candidates[index].id, isSeeking: candidates[index].isSeeking };
    }
  }
  const kind = isSeeking === undefined ? 'card' : isSeeking ? 'demand' : 'offer';
  test.skip(true, `No existing ${tab} search ${kind}${requireBusinessHours ? ' with business hours' : ''} fixture. This is NOT a mobile-card PASS.`);
  throw new Error('Unreachable after the explicit missing-fixture skip.');
}

/** Verify the profile-style mobile front without triggering any server-side action. */
export async function expectSearchMobileFront(card: Locator, isSeeking: boolean): Promise<Locator> {
  const mobileCard = card.locator('div[role="button"][tabindex="0"]');
  await expect(mobileCard).toBeVisible();
  await expect(card.getByRole('button', { name: 'Otočiť', exact: true, includeHidden: true })).toHaveCount(0);
  await expect(mobileCard.locator(':scope > div.pointer-events-none').getByText(isSeeking ? 'Hľadám' : 'Ponúkam', { exact: true }))
    .toBeVisible();
  await expect(mobileCard.getByRole('button', { name: 'Páči sa mi to', exact: true })).toBeVisible();
  await expect(mobileCard.getByRole('button', { name: /^(?:Pridať recenziu|Mám záujem|Pomôcť|Správa|Upraviť kartu|Vymazať kartu)$/, includeHidden: true }))
    .toHaveCount(0);
  return mobileCard;
}

/** First tap dismisses the banner; the second opens a bottom sheet without changing the URL. */
export async function openSearchMobileDetail(page: Page, card: Locator): Promise<Locator> {
  const source = page.url();
  const mobileCard = card.locator('div[role="button"][tabindex="0"]');
  const sheet = searchDetailSheet(page);
  await expect(sheet).toHaveCount(0);
  await mobileCard.tap({ position: { x: 24, y: 24 } });
  await expect(mobileCard.locator(':scope > div.pointer-events-none')).toHaveCount(0);
  await expect(sheet).toHaveCount(0);
  expect(page.url()).toBe(source);
  await mobileCard.tap({ position: { x: 24, y: 24 } });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { level: 2, name: 'Popis', exact: true })).toBeVisible();
  await expect(sheet.getByText('Páči sa mi to', { exact: true })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Páči sa mi to', exact: true, includeHidden: true })).toHaveCount(0);
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  await expect.poll(async () => {
    const box = await sheet.boundingBox();
    return box ? Math.abs(box.y + box.height - viewport!.height) : Infinity;
  }).toBeLessThan(2);
  expect(page.url()).toBe(source);
  return sheet;
}
