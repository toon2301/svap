import { expect, test, type Locator, type Page } from '@playwright/test';
import { readWatches, type SavedWatch } from './offer-watch';

export const RESULTS_PANEL = 'section[aria-labelledby="offer-watch-results-matches-title"]';

export function matchesUrl(watchId: number, url: URL): boolean {
  return url.pathname === `/api/auth/offer-watches/${watchId}/matches/`;
}

export type MatchPage = { ids: number[]; next: string | null };

/** Keep only card IDs/cursor metadata; never attach personal response bodies to reports. */
export function matchPage(data: unknown): MatchPage {
  if (!data || typeof data !== 'object') throw new Error('Matches response is not an object.');
  const dto = data as { results?: { id?: unknown }[]; next?: unknown };
  if (!Array.isArray(dto.results) || (dto.next !== null && typeof dto.next !== 'string')) {
    throw new Error('Matches pagination response is malformed.');
  }
  const ids = dto.results.map(({ id }) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
      throw new Error('A match has no valid card ID.');
    }
    return id;
  });
  return { ids, next: dto.next as string | null };
}

/** Discover an OWNED reusable fixture by GET only; never seed or edit production cards. */
export async function paginatedWatchOrSkip(page: Page): Promise<SavedWatch> {
  await page.goto('/dashboard/settings/watches');
  const owned = await readWatches(page);
  const rawId = process.env.E2E_OFFER_WATCH_RESULTS_ID;
  const explicitId = rawId ? Number(rawId) : null;
  if (rawId && (!Number.isSafeInteger(explicitId) || Number(explicitId) <= 0)) {
    throw new Error('E2E_OFFER_WATCH_RESULTS_ID must be a positive integer owned by the test account.');
  }
  const candidates = explicitId === null ? owned : owned.filter((watch) => watch.id === explicitId);
  if (explicitId !== null && candidates.length === 0) {
    throw new Error('Configured results fixture does not belong to the test account.');
  }
  for (const watch of candidates) {
    const response = await page.evaluate(async (id) => {
      const result = await fetch(`/api/auth/offer-watches/${id}/matches/`, { credentials: 'include' });
      const data = await result.json().catch(() => null);
      return { status: result.status, data: { results: data?.results?.map((item: { id?: number }) => ({ id: item.id })), next: data?.next } };
    }, watch.id);
    if (response.status !== 200) throw new Error(`Reading results fixture failed: HTTP ${response.status}.`);
    const first = matchPage(response.data);
    if (first.ids.length === 10 && first.next) return watch;
  }
  test.skip(true, 'No owned reusable watch with at least 11 live matches; this is NOT a pagination PASS.');
  throw new Error('Unreachable after a missing-fixture skip.');
}

export async function openResults(page: Page, watchId: number): Promise<MatchPage> {
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === 'GET'
      && matchesUrl(watchId, new URL(response.url()))
      && !new URL(response.url()).searchParams.has('cursor'),
  ).catch(() => null);
  await page.goto(`/dashboard/watches?watch=${watchId}`);
  const response = await responsePromise;
  if (!response) throw new Error('Opening results did not produce a matches response.');
  expect(response.status()).toBe(200);
  const first = matchPage(await response.json());
  await expect(page.locator(RESULTS_PANEL).getByRole('article')).toHaveCount(first.ids.length);
  return first;
}

/** Tag existing DOM nodes solely inside this test to prove they survive a failed page. */
export async function markOriginalCards(panel: Locator): Promise<number> {
  return panel.getByRole('article').evaluateAll((cards) => {
    cards.forEach((card, index) => card.setAttribute('data-watch-test-index', String(index)));
    return cards.length;
  });
}

export async function expectOriginalCards(panel: Locator, count: number): Promise<void> {
  expect(await panel.locator('[data-watch-test-index]').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-watch-test-index')),
  )).toEqual(Array.from({ length: count }, (_, index) => String(index)));
}

/** Verify real layout AND document order; a text-existence assertion would miss OW-02. */
export async function expectErrorAfterAllCards(panel: Locator): Promise<void> {
  const alert = panel.getByRole('alert');
  await expect(alert).toHaveCount(1);
  await alert.scrollIntoViewIfNeeded();
  const geometry = await panel.evaluate((section) => {
    const notice = section.querySelector('[role="alert"]')!;
    const cards = Array.from(section.querySelectorAll('article'));
    return {
      followsAll: cards.length > 0 && cards.every((card) => Boolean(card.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING)),
      noticeTop: notice.getBoundingClientRect().top,
      lastRowBottom: Math.max(...cards.map((card) => card.getBoundingClientRect().bottom)),
    };
  });
  expect(geometry.followsAll).toBe(true);
  expect(geometry.noticeTop).toBeGreaterThanOrEqual(geometry.lastRowBottom - 1);
}

export async function expectErrorBeforeCards(panel: Locator): Promise<void> {
  const alert = panel.getByRole('alert');
  await expect(alert).toHaveCount(1);
  expect(await panel.evaluate((section) => {
    const notice = section.querySelector('[role="alert"]')!;
    const first = section.querySelector('article')!;
    return Boolean(notice.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
}
