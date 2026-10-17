import { expect, type Locator, type Page, type Request, type Response } from '@playwright/test';
import { bottomNav, gotoDashboardHome, sideNav } from './dashboard';

export const DIAGNOSTICS_LABEL = 'Diagnostika vyhľadávania';
export const SEARCH_PATH = '/api/auth/dashboard/search/';

/** Keep fixture state local to the disposable browser, not the authenticated user's PWA. */
export async function initializeSearchContext(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((colorTheme) => {
    localStorage.setItem('appLocale', 'sk');
    localStorage.setItem('svaply_theme', colorTheme);
    localStorage.setItem('appLastManualOfferCountryV1', 'CZ');
    localStorage.setItem('appGeoDetectionCacheV2', JSON.stringify({
      country: 'SK', detectedAt: Date.now(), status: 'ok',
    }));
  }, theme);
}

/** Observe real requests only; no search, geolocation, profile, or result response is replaced. */
export function isPanelSearch(request: Request, query: string): boolean {
  const url = new URL(request.url());
  return request.method() === 'GET' && url.pathname === SEARCH_PATH && url.searchParams.get('q') === query;
}

export function diagnosticValue(region: Locator, label: string): Locator {
  return region.locator('dt').filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=following-sibling::dd[1]');
}

/** Reduce the response immediately to aggregate evidence, never retain personal result objects. */
export async function panelSummary(response: Response): Promise<{ country: string | null; count: number }> {
  if (response.status() !== 200) throw new Error(`Real panel search failed: HTTP ${response.status()}.`);
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('skills' in data) || !('users' in data)
    || !Array.isArray(data.skills) || !Array.isArray(data.users)) {
    throw new Error('Real panel search returned invalid result collections.');
  }
  return { country: new URL(response.url()).searchParams.get('country'), count: data.skills.length };
}

export async function openInitialSearch(page: Page, isMobile: boolean): Promise<Locator> {
  await gotoDashboardHome(page);
  if (isMobile) await bottomNav(page, 'Hľadať').tap();
  else await sideNav(page, 'Vyhľadávanie').click();
  const input = page.locator('[data-onboarding="search-input"] input').filter({ visible: true });
  await expect(input).toBeVisible();
  await page.getByRole('button', { name: DIAGNOSTICS_LABEL, exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('region', { name: DIAGNOSTICS_LABEL, exact: true })).toBeVisible();
  return input;
}

export function resultAuthors(page: Page): Locator {
  return page.locator('[data-dashboard-main] button.rounded-t-2xl');
}

/** Use existing broad-query cards; a missing/deleted fixture is a failure, never a skipped PASS. */
export async function openScrollableResults(page: Page, tab: 'all' | 'offers'): Promise<string> {
  const query = process.env.E2E_SEARCH_NAV_QUERY?.trim() || 'te';
  if (query.length < 2) throw new Error('The reusable search query must contain at least two characters.');
  const path = tab === 'all' ? '/api/auth/search/global/' : '/api/auth/search/';
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === path && url.searchParams.get('q') === query;
  });
  const params = new URLSearchParams({ q: query, tab, ...(tab === 'offers' ? { sort: 'newest', page: '1' } : { users_page: '1' }) });
  await page.goto(`/search?${params.toString()}`);
  const response = await responsePromise;
  if (response.status() !== 200) throw new Error(`Real result search failed: HTTP ${response.status()}.`);
  const data: unknown = await response.json();
  const list = data && typeof data === 'object'
    ? (data as Record<string, unknown>)[tab === 'all' ? 'offers' : 'results'] : null;
  if (!Array.isArray(list)) throw new Error('Real result search returned an invalid card collection.');
  await expect.poll(() => resultAuthors(page).count(), { message: 'Existing reusable search cards are missing' })
    .toBeGreaterThanOrEqual(3);
  // OW-17 is separate: explicitly close the desktop overlay before interacting with the cards.
  await page.keyboard.press('Escape');
  const panel = page.locator('[data-dashboard-main]').locator('xpath=preceding-sibling::div[@aria-hidden][1]');
  await expect(panel).toHaveAttribute('aria-hidden', 'true');
  return page.url();
}

/** A real off-screen author causes the nested result scroller to move, without a synthetic scroll fixture. */
export async function openDeepResultAuthor(page: Page, isMobile: boolean): Promise<number> {
  const author = resultAuthors(page).last();
  await author.scrollIntoViewIfNeeded();
  const main = page.locator('[data-dashboard-main]');
  const top = await main.evaluate((element) => Math.round(element.scrollTop));
  expect(top, 'The reusable result fixture must exercise a non-trivial nested scroll position').toBeGreaterThan(250);
  if (isMobile) await author.tap();
  else await author.click();
  await expect(page).toHaveURL(/\/dashboard\/users\/[^/?]+(?:\?|$)/);
  await expect(page.locator('[data-dashboard-main]')).toBeVisible();
  return top;
}

export async function expectRestoredSearch(page: Page, url: string, top: number): Promise<void> {
  await expect(page).toHaveURL(url);
  await expect(resultAuthors(page).last()).toBeVisible();
  await expect.poll(async () => {
    const restored = await page.locator('[data-dashboard-main]').evaluate((element) => element.scrollTop);
    return Math.abs(restored - top);
  }, { message: 'Returning from the author profile must restore the nested result scroll position' }).toBeLessThanOrEqual(2);
}
