import { expect, test } from '@playwright/test';
import { ownProfileWithCardsOrSkip } from './support/offer-watch-card-actions';
import { requireCompletedOwnCardHint } from './support/offer-card-readonly';

// Real Railway regression with existing own cards only. Never click Like or save account/content changes.
// Expected labels are independent of the message dictionaries, so an incorrect translation cannot pass.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

for (const { locale, likeLabel } of [
  { locale: 'pl', likeLabel: 'Lubię to' },
  { locale: 'cs', likeLabel: 'Líbí se mi to' },
] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`OW-04 profile Like translation – ${locale} / ${theme}`, () => {
      let attemptedWrites: string[];

      test.beforeEach(async ({ page, baseURL }) => {
        if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
          throw new Error('These tests are restricted to the configured Railway deployment.');
        }
        attemptedWrites = [];
        await page.addInitScript(({ language, colorTheme }) => {
          localStorage.setItem('appLocale', language);
          localStorage.setItem('svaply_theme', colorTheme);
        }, { language: locale, colorTheme: theme });
        await page.route((url) => /^\/api\/auth\/(?:offer-watches|skills|hints\/(?:mobile|desktop)-card-flip)(?:\/|$)/.test(url.pathname), async (route) => {
          const method = route.request().method();
          if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
            await route.continue();
          } else {
            attemptedWrites.push(method);
            await route.abort();
          }
        });
      });

      test.afterEach(() => {
        expect(attemptedWrites, 'Translation regressions must not modify watches/cards/likes').toEqual([]);
      });

      test('existing profile card exposes the translated Like control; desktop back uses the same text', async ({ page, isMobile }) => {
        await ownProfileWithCardsOrSkip(page, isMobile);
        await expect.poll(() => page.locator('html').evaluate((html) => html.classList.contains('dark'))).toBe(theme === 'dark');

        const main = page.locator('[data-dashboard-main]');
        const like = main.getByRole('button', { name: likeLabel, exact: true, includeHidden: true }).first();
        await expect(like).toBeVisible();
        await expect(like).toHaveAttribute('aria-label', likeLabel);
        await expect(like).toHaveAttribute('title', likeLabel);
        await expect(main.getByRole('button', { name: 'Páči sa mi to', exact: true })).toHaveCount(0);
        await expect(main.getByRole('button', { name: 'Polubienia', exact: true })).toHaveCount(0);

        if (isMobile) return; // Mobile's detail is a separate flow; only its unchanged Like control is in scope.
        await requireCompletedOwnCardHint(page, false);

        // The nearest shared-card group contains both faces; the profile also has an outer group wrapper.
        const card = like.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " group ")][1]');
        const flips = card.getByRole('button', { name: 'Otočiť', exact: true, includeHidden: true });
        await expect(flips).toHaveCount(2);
        await expect(flips.nth(0)).toBeVisible();
        await expect(flips.nth(1)).toBeHidden();
        await flips.nth(0).click();
        await expect(flips.nth(0)).toBeHidden();
        await expect(flips.nth(1)).toBeVisible();

        const summary = card.locator('span').filter({ hasText: new RegExp(`^${likeLabel}$`) });
        await expect(summary).toHaveCount(1);
        await expect(summary).toBeVisible();
        await expect(card.locator('span').filter({ hasText: /^(?:Páči sa mi to|Polubienia)$/ })).toHaveCount(0);
        await flips.nth(1).click();
        await expect(like).toBeVisible();
        await expect(like).toHaveAttribute('title', likeLabel);
      });
    });
  }
}
