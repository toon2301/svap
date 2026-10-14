import { expect, test, type Page } from '@playwright/test';
import { ownProfileWithCardsOrSkip } from './support/offer-watch-card-actions';
import { requireCompletedOwnCardHint } from './support/offer-card-readonly';

// Independent expected labels: importing the message dictionaries could hide an incorrect translation.
// Reuse owned cards and completed flip hints; never create content, click Like, or complete a server-side hint.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

const TRANSLATIONS = [
  { locale: 'sk', ratings: 'Hodnotenia', allReviews: 'Všetky recenzie' },
  { locale: 'cs', ratings: 'Hodnocení', allReviews: 'Všechny recenze' },
  { locale: 'en', ratings: 'Ratings', allReviews: 'All reviews' },
  { locale: 'de', ratings: 'Bewertungen', allReviews: 'Alle Bewertungen' },
  { locale: 'pl', ratings: 'Oceny', allReviews: 'Wszystkie opinie' },
  { locale: 'hu', ratings: 'Értékelések', allReviews: 'Összes értékelés' },
] as const;

/** Return only owned non-seeking offer IDs, never personal response bodies. */
async function ownOffersOrSkip(page: Page): Promise<number[]> {
  const fixture = await page.evaluate(async () => {
    const skillsResponse = await fetch('/api/auth/skills/', { credentials: 'include' });
    const skills = await skillsResponse.json().catch(() => null);
    const validSkills = Array.isArray(skills) && skills.every((item) => (
      Number.isSafeInteger(item?.id) && item.id > 0 && typeof item.is_seeking === 'boolean'
    ));
    return {
      skillsStatus: skillsResponse.status,
      validSkills,
      offerIds: validSkills ? skills.filter((item) => !item.is_seeking).map((item) => item.id as number) : [],
    };
  });
  if (fixture.skillsStatus !== 200 || !fixture.validSkills) {
    throw new Error(`Reading the reusable offer fixture failed: HTTP ${fixture.skillsStatus}.`);
  }
  test.skip(fixture.offerIds.length === 0, 'No owned reusable non-seeking offer. This is NOT a review-translation PASS.');
  return fixture.offerIds;
}

for (const { locale, ratings, allReviews } of TRANSLATIONS) {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`Offer-card review translations – ${locale} / ${theme}`, () => {
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
        expect(attemptedWrites, 'Review-translation regressions must not modify cards, watches, likes, or hints').toEqual([]);
      });

      test('desktop: an existing offer back translates ratings and its review link', async ({ page, isMobile }) => {
        test.skip(isMobile, 'The desktop back and mobile bottom detail are separate existing flows.');
        await ownProfileWithCardsOrSkip(page, isMobile, locale === 'en' ? 'Profile' : 'Profil');
        const offerIds = await ownOffersOrSkip(page);
        await requireCompletedOwnCardHint(page, isMobile);
        await expect.poll(() => page.locator('html').evaluate((html) => html.classList.contains('dark'))).toBe(theme === 'dark');

        // This existing review action is rendered only on non-seeking cards with a review destination.
        // Keep the anchor resolvable while its front face is hidden after flipping to the back.
        const reviewAction = page.locator('[data-dashboard-main]').getByRole('button', { name: 'Pridať recenziu', exact: true, includeHidden: true }).first();
        await expect(reviewAction).toBeVisible();
        const card = reviewAction.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " group ")][1]');
        const flips = card.getByRole('button', { name: 'Otočiť', exact: true, includeHidden: true });
        await expect(flips).toHaveCount(2);
        await flips.nth(0).click();
        await expect(flips.nth(0)).toBeHidden();
        await expect(flips.nth(1)).toBeVisible();
        await expect(card.getByText(ratings, { exact: true })).toBeVisible();
        const reviewLink = card.getByRole('link', { name: allReviews, exact: true });
        await expect(reviewLink).toBeVisible();
        const href = await reviewLink.getAttribute('href');
        const offerId = href?.match(/^\/dashboard\/offers\/(\d+)\/reviews(?:\?|$)/)?.[1];
        expect(offerId, 'The translated link must keep its real offer-review destination').toBeDefined();
        expect(offerIds).toContain(Number(offerId));
        await flips.nth(1).click();
        await expect(reviewAction).toBeVisible();
      });

      test('mobile: the existing offer bottom detail translates ratings without adding a review link', async ({ page, isMobile }) => {
        test.skip(!isMobile, 'Existing mobile profile bottom-detail regression.');
        await ownProfileWithCardsOrSkip(page, isMobile, locale === 'en' ? 'Profile' : 'Profil');
        await ownOffersOrSkip(page);
        await requireCompletedOwnCardHint(page, isMobile);
        await expect.poll(() => page.locator('html').evaluate((html) => html.classList.contains('dark'))).toBe(theme === 'dark');

        const card = page.locator('[data-dashboard-main] div[role="button"][tabindex="0"]').filter({
          has: page.getByRole('button', { name: 'Pridať recenziu', exact: true }),
        }).first();
        await expect(card).toBeVisible();
        const sheet = page.locator('div.fixed.inset-x-0.bottom-0').filter({ has: page.locator('h2') });
        await expect(sheet).toHaveCount(0);
        // Top-left is away from all Like/edit/review/gallery actions. First tap dismisses the offer banner.
        await card.tap({ position: { x: 24, y: 24 } });
        await expect(sheet).toHaveCount(0);
        await card.tap({ position: { x: 24, y: 24 } });
        await expect(sheet).toBeVisible();
        await expect(sheet.getByText(ratings, { exact: true })).toBeVisible();
        await expect(sheet.getByRole('link', { name: allReviews, exact: true })).toHaveCount(0);
        await expect(sheet.getByText(allReviews, { exact: true })).toHaveCount(0);
        await sheet.getByRole('button').first().tap();
        await expect(sheet).toHaveCount(0);
        await expect(card).toBeVisible();
      });
    });
  }
}
