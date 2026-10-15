import { expect, test } from '@playwright/test';
import { bottomNav, gotoDashboardHome } from './support/dashboard';
import {
  expectSearchMobileFront,
  openSearchFixtureOrSkip,
  openSearchMobileDetail,
  searchDetailSheet,
  searchOfferCards,
} from './support/search-mobile-cards';

// Real production GET fixtures only; no Like/request/message/profile/hint writes or new test content.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Search mobile-card parity – ${theme}`, () => {
    let attemptedWrites: string[];

    test.beforeEach(async ({ page, baseURL }) => {
      if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
        throw new Error('These tests are restricted to the configured Railway deployment.');
      }
      attemptedWrites = [];
      await page.addInitScript((colorTheme) => {
        localStorage.setItem('appLocale', 'sk');
        localStorage.setItem('svaply_theme', colorTheme);
      }, theme);
      await page.route((url) => /^\/api\/auth\/(?:offer-watches|skills|users|me|hints|skill-requests|messaging)(?:\/|$)/.test(url.pathname), async (route) => {
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
      expect(attemptedWrites, 'Search card checks must not write content, likes, profiles, requests, messages, or hints').toEqual([]);
    });

    for (const tab of ['all', 'offers'] as const) {
      for (const isSeeking of [false, true]) {
        for (const width of [320, 393]) {
          test(`mobile: ${tab} ${isSeeking ? 'demand' : 'offer'} at ${width}px uses a two-tap bottom detail`, async ({ page, isMobile }) => {
            test.skip(!isMobile, 'Profile-style mobile card, not the unchanged desktop flip.');
            test.setTimeout(120_000);
            await page.setViewportSize({ width, height: 700 });
            const fixture = await openSearchFixtureOrSkip(page, tab, isSeeking);
            const card = searchOfferCards(page).nth(fixture.index);
            await expectSearchMobileFront(card, isSeeking);
            const source = page.url();
            const previousOverflow = await page.evaluate(() => document.body.style.overflow);
            const sheet = await openSearchMobileDetail(page, card);
            await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
            const scrollArea = sheet.locator('div.overflow-y-auto').first();
            const scrollable = await scrollArea.evaluate((element) => element.scrollHeight > element.clientHeight);
            if (scrollable) {
              await scrollArea.evaluate((element) => { element.scrollTop = element.scrollHeight; });
              await expect.poll(() => scrollArea.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
            }
            await sheet.getByRole('button', { name: 'Zavrieť', exact: true }).tap();
            await expect(sheet).toHaveCount(0);
            await expectSearchMobileFront(card, isSeeking);
            await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe(previousOverflow);
            expect(page.url()).toBe(source);
            await expect.poll(() => page.locator('html').evaluate((html) => html.classList.contains('dark')))
              .toBe(theme === 'dark');
            const bounds = await card.boundingBox();
            expect(bounds).not.toBeNull();
            expect(bounds!.x).toBeGreaterThanOrEqual(0);
            expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
          });
        }

        test(`desktop: ${tab} ${isSeeking ? 'demand' : 'offer'} retains flip, Like, and author navigation`, async ({ page, isMobile }) => {
          test.skip(isMobile, 'Desktop flip must remain unchanged.');
          test.setTimeout(120_000);
          const fixture = await openSearchFixtureOrSkip(page, tab, isSeeking);
          // OW-17 tracks the pre-existing first-click loss while the open panel collapses.
          // Isolate card behavior with an explicitly closed panel; do not retry the flip.
          await page.keyboard.press('Escape');
          const searchPanel = page.locator('[data-dashboard-main]')
            .locator('xpath=preceding-sibling::div[@aria-hidden][1]');
          await expect(searchPanel).toHaveAttribute('aria-hidden', 'true');
          await expect.poll(async () => (await searchPanel.boundingBox())?.width).toBe(0);
          const card = searchOfferCards(page).nth(fixture.index);
          await expect(card.locator('div[role="button"][tabindex="0"]')).toHaveCount(0);
          const flips = card.getByRole('button', { name: 'Otočiť', exact: true, includeHidden: true });
          await expect(flips).toHaveCount(2);
          const like = card.getByRole('button', { name: 'Páči sa mi to', exact: true });
          await expect(like).toBeVisible();
          await flips.nth(0).click();
          await expect(flips.nth(0)).toBeHidden();
          await expect(flips.nth(1)).toBeVisible();
          await expect(card.getByText('Páči sa mi to', { exact: true })).toBeVisible();
          await expect(searchDetailSheet(page)).toHaveCount(0);
          await flips.nth(1).click();
          await expect(like).toBeVisible();
          const source = page.url();
          await card.locator('button.rounded-t-2xl').click();
          await expect(page).toHaveURL(/\/dashboard\/users\/[^/?]+(?:\?|$)/);
          await page.goBack();
          await expect(page).toHaveURL(source);
          await expect(searchOfferCards(page).nth(fixture.index)).toBeVisible();
        });
      }

      test(`mobile: ${tab} author returns to the exact search URL`, async ({ page, isMobile }) => {
        test.skip(!isMobile, 'Mobile search/profile origin regression.');
        test.setTimeout(120_000);
        const fixture = await openSearchFixtureOrSkip(page, tab);
        const source = page.url();
        const card = searchOfferCards(page).nth(fixture.index);
        await card.locator('button.rounded-t-2xl').tap();
        await expect(page).toHaveURL(/\/dashboard\/users\/[^/?]+(?:\?|$)/);
        await expect(page.locator('[data-dashboard-main]')).toBeVisible();
        await page.getByRole('button', { name: 'Späť', exact: true }).filter({ visible: true }).first().tap();
        await expect(page).toHaveURL(source);
        await expect(searchOfferCards(page).nth(fixture.index)).toBeVisible();
        await expect(searchDetailSheet(page)).toHaveCount(0);
      });

      test(`mobile: ${tab} resizing an open sheet to desktop restores scrolling and desktop flip`, async ({ page, isMobile }) => {
        test.skip(!isMobile, 'One responsive boundary per search result surface.');
        test.setTimeout(120_000);
        const fixture = await openSearchFixtureOrSkip(page, tab);
        const card = searchOfferCards(page).nth(fixture.index);
        const previousOverflow = await page.evaluate(() => document.body.style.overflow);
        await expectSearchMobileFront(card, fixture.isSeeking);
        await openSearchMobileDetail(page, card);
        await page.setViewportSize({ width: 1280, height: 800 });
        await expect(searchDetailSheet(page)).toHaveCount(0);
        await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe(previousOverflow);
        await expect(card.getByRole('button', { name: 'Otočiť', exact: true }).first()).toBeVisible();
        await page.setViewportSize({ width: 393, height: 700 });
        await expectSearchMobileFront(card, fixture.isSeeking);
      });

      test(`mobile: ${tab} detail closes via backdrop and downward pointer drag`, async ({ page, isMobile }) => {
        test.skip(!isMobile, 'Existing bottom-sheet dismissal, without introducing history or Escape semantics.');
        test.setTimeout(120_000);
        const fixture = await openSearchFixtureOrSkip(page, tab);
        const card = searchOfferCards(page).nth(fixture.index);
        const source = page.url();
        const previousOverflow = await page.evaluate(() => document.body.style.overflow);
        await expectSearchMobileFront(card, fixture.isSeeking);
        let sheet = await openSearchMobileDetail(page, card);
        await page.locator('div.fixed.inset-0[class~="bg-black/40"]').tap({ position: { x: 8, y: 8 } });
        await expect(sheet).toHaveCount(0);
        await expectSearchMobileFront(card, fixture.isSeeking);
        sheet = await openSearchMobileDetail(page, card);
        const handle = sheet.getByLabel('Potiahni nadol pre zatvorenie', { exact: true });
        const bounds = await handle.boundingBox();
        expect(bounds).not.toBeNull();
        // Real browser pointer events on the handle, away from its close button.
        const startX = bounds!.x + 24;
        const startY = bounds!.y + 10;
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 100, { steps: 8 });
        await page.mouse.up();
        await expect(sheet).toHaveCount(0);
        await expectSearchMobileFront(card, fixture.isSeeking);
        await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe(previousOverflow);
        expect(page.url()).toBe(source);
      });
    }

    test('mobile: an existing business offer opens hours and returns to its detail', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Requires an existing company card with enabled hours; no fixture is created.');
      test.setTimeout(120_000);
      const fixture = await openSearchFixtureOrSkip(page, 'offers', false, true);
      const card = searchOfferCards(page).nth(fixture.index);
      await expectSearchMobileFront(card, false);
      const sheet = await openSearchMobileDetail(page, card);
      await sheet.getByRole('button', { name: 'Otváracie hodiny', exact: true }).tap();
      const hours = page.locator('div.fixed.inset-0').filter({
        has: page.getByRole('button', { name: 'Zavrieť', exact: true }),
      });
      await expect(hours).toBeVisible();
      await expect(hours.getByText('Otváracie hodiny', { exact: true })).toBeVisible();
      await hours.getByRole('button', { name: 'Zavrieť', exact: true }).tap();
      await expect(hours).toHaveCount(0);
      await expect(sheet).toBeVisible();
      await sheet.getByRole('button', { name: 'Zavrieť', exact: true }).tap();
      await expect(sheet).toHaveCount(0);
      await expectSearchMobileFront(card, false);
    });

    test('mobile: real dashboard search → View All uses profile-style cards', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Real mobile dashboard search entry, not direct-URL coverage.');
      test.setTimeout(120_000);
      const fixture = await openSearchFixtureOrSkip(page, 'all');
      await gotoDashboardHome(page);
      await bottomNav(page, 'Hľadať').tap();
      const input = page.locator('[data-onboarding="search-input"] input').filter({ visible: true });
      await expect(input).toBeVisible();
      const responsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return response.request().method() === 'GET' && url.pathname === '/api/auth/dashboard/search/'
          && url.searchParams.get('q') === fixture.query;
      });
      await input.fill(fixture.query);
      const response = await responsePromise;
      if (response.status() !== 200) throw new Error(`Dashboard search failed: HTTP ${response.status()}.`);
      const data = await response.json();
      if (!data || !Array.isArray(data.skills) || !Array.isArray(data.users)) {
        throw new Error('Dashboard search returned an invalid existing-results collection.');
      }
      test.skip(data.skills.length + data.users.length === 0, 'No existing dashboard View All fixture. This is NOT a mobile-entry PASS.');
      await page.getByRole('button', { name: 'Zobraziť všetko', exact: true }).filter({ visible: true }).tap();
      await expect(page).toHaveURL((url) => url.pathname === '/search' && url.searchParams.get('q') === fixture.query);
      const card = searchOfferCards(page).nth(fixture.index);
      await expectSearchMobileFront(card, fixture.isSeeking);
      const sheet = await openSearchMobileDetail(page, card);
      await sheet.getByRole('button', { name: 'Zavrieť', exact: true }).tap();
      await expect(sheet).toHaveCount(0);
    });
  });
}
