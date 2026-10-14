import { expect, test, type Locator, type Page } from '@playwright/test';
import { readWatches, type SavedWatch } from './offer-watch';
import { matchPage } from './offer-watch-results';

export const LIKE_LABEL = 'Páči sa mi to';

/** Reuse an owned watch with at least one live result; discovery never creates or edits content. */
export async function watchWithCardsOrSkip(page: Page, isSeeking?: boolean): Promise<SavedWatch> {
  await page.goto('/dashboard/settings/watches');
  const owned = await readWatches(page);
  const rawId = process.env.E2E_OFFER_WATCH_RESULTS_ID;
  const explicitId = rawId === undefined ? null : Number(rawId);
  if (rawId !== undefined && (!rawId.trim() || !Number.isSafeInteger(explicitId) || Number(explicitId) <= 0)) {
    throw new Error('E2E_OFFER_WATCH_RESULTS_ID must be a positive integer owned by the test account.');
  }
  const configured = explicitId === null ? owned : owned.filter(({ id }) => id === explicitId);
  if (explicitId !== null && configured.length === 0) {
    throw new Error('Configured results fixture does not belong to the test account.');
  }
  for (const watch of configured.filter((item) => isSeeking === undefined || item.is_seeking === isSeeking)) {
    const response = await page.evaluate(async (id) => {
      const result = await fetch(`/api/auth/offer-watches/${id}/matches/`, { credentials: 'include' });
      const data = await result.json().catch(() => null);
      // Return only pagination/card IDs; do not attach personal API bodies to test reports.
      return {
        status: result.status,
        data: { results: data?.results?.map((item: { id?: number }) => ({ id: item.id })), next: data?.next },
      };
    }, watch.id);
    if (response.status !== 200) throw new Error(`Reading results fixture failed: HTTP ${response.status}.`);
    if (matchPage(response.data).ids.length > 0) return watch;
  }
  const kind = isSeeking === undefined ? '' : isSeeking ? 'demand ' : 'offer ';
  test.skip(true, `No owned reusable ${kind}watch with live results. This is NOT a card-actions PASS.`);
  throw new Error('Unreachable after a missing-fixture skip.');
}

/** Remove only the front Like action; retain one non-interactive, numeric back summary. */
export async function expectWatchLikeSummary(card: Locator): Promise<void> {
  await expect(card.getByRole('button', { name: LIKE_LABEL, exact: true, includeHidden: true })).toHaveCount(0);
  await expect(card.locator(`[title="${LIKE_LABEL}"]`)).toHaveCount(0);
  const label = card.getByText(LIKE_LABEL, { exact: true });
  await expect(label).toHaveCount(1);
  const summary = label.locator('..');
  await expect(summary.locator('svg path[d^="M20.84 4.61"]')).toHaveCount(1);
  await expect(summary.locator('span').last()).toHaveText(/^\d[\d\s\u00a0\u202f]*$/);
  await expect(summary.locator('button, a, [role="button"], [tabindex]')).toHaveCount(0);
  await expect(card.locator('[data-default-cta], [data-message-cta]')).toHaveCount(0);
}

/** Exercise both real flip controls, proving that the two faces still switch in both directions. */
export async function flipWatchCardBothWays(card: Locator): Promise<void> {
  const flips = card.getByRole('button', { name: 'Otočiť', exact: true, includeHidden: true });
  await expect(flips).toHaveCount(2);
  await expect(flips.nth(0)).toBeVisible();
  await expect(flips.nth(1)).toBeHidden();
  await expectWatchLikeSummary(card);
  await flips.nth(0).click();
  await expect(flips.nth(0)).toBeHidden();
  await expect(flips.nth(1)).toBeVisible();
  await expectWatchLikeSummary(card);
  const summaryLabel = card.getByText(LIKE_LABEL, { exact: true });
  await expect(summaryLabel).toBeVisible();
  await summaryLabel.click();
  await expect(flips.nth(1)).toBeVisible();
  await flips.nth(1).click();
  await expect(flips.nth(0)).toBeVisible();
  await expect(flips.nth(1)).toBeHidden();
  await expectWatchLikeSummary(card);
}

/** Inspect existing own cards only; missing reusable content is a skip, never a false PASS. */
export async function ownProfileWithCardsOrSkip(page: Page, isMobile: boolean, profileLabel = 'Profil'): Promise<void> {
  await page.goto('/dashboard');
  await expect(page.getByTestId('feed-list')).toBeVisible();
  const response = await page.evaluate(async () => {
    const result = await fetch('/api/auth/skills/', { credentials: 'include' });
    const data = await result.json().catch(() => null);
    return { status: result.status, count: Array.isArray(data) ? data.length : null };
  });
  if (response.status !== 200 || response.count === null) {
    throw new Error(`Reading own-card fixture failed: HTTP ${response.status}.`);
  }
  test.skip(response.count === 0, 'The test account has no own reusable cards. This is NOT a profile-Like PASS.');
  if (isMobile) {
    await page.getByRole('button', { name: profileLabel, exact: true }).filter({ visible: true }).tap();
  } else {
    await page.locator('[data-sidebar="left"] [data-sidebar-nav-item="profile"]').click();
  }
  await expect(page).toHaveURL(/\/dashboard\/users\/[^/?]+(?:\?|$)/);
  await expect(page.locator('[data-onboarding="profile-edit-button"]').filter({ visible: true })).toBeVisible();
}
