import { test, type Page } from '@playwright/test';

/** Reuse completed flip hints so a read-only card test cannot mark onboarding as completed. */
export async function requireCompletedOwnCardHint(page: Page, isMobile: boolean): Promise<void> {
  const result = await page.evaluate(async (mobile) => {
    const response = await fetch('/api/auth/me/', { credentials: 'include' });
    const data = await response.json().catch(() => null);
    const hint = mobile ? data?.mobile_card_flip_hint : data?.desktop_card_flip_hint;
    // Do not expose the profile payload in Playwright diagnostics.
    return { status: response.status, completed: hint?.own_completed };
  }, isMobile);
  if (result.status !== 200 || typeof result.completed !== 'boolean') {
    throw new Error(`Reading the existing card-hint fixture failed: HTTP ${result.status}.`);
  }
  test.skip(!result.completed, 'Own-card flip hint is not already completed. No PATCH is sent; this is NOT a flip PASS.');
}
