import { expect, test, type Page } from '@playwright/test';

import {
  bottomNav,
  expectSameMain,
  gotoDashboardHome,
  historyLength,
  mainInstance,
  mainScrollTop,
  pathOf,
  recordMainInstance,
} from './support/dashboard';
import { FEED_HOME_PATHS } from './support/feed';

// Detail príspevku z Nástenky: mobil = vrstva v stave (adresa sa nemení) alebo celá stránka, desktop = overlay. Iba čítanie.

/** Komentáre k jednej z prvých kariet (nie k úplne hornej, aby `main` mal čo scrollovať). */
async function commentsButton(page: Page) {
  const cards = page.getByTestId('feed-post-card');
  const index = Math.min(2, (await cards.count()) - 1);
  const button = cards.nth(index).getByTestId('feed-comments-button');
  await button.scrollIntoViewIfNeeded();
  return button;
}

test.describe('mobil', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'webkit-mobile', 'Detail príspevku na iPhone – len webkit-mobile.');
    await recordMainInstance(page);
    await gotoDashboardHome(page);
  });

  test('the comments layer opens and closes without touching the URL, the history, <main> or its scroll', async ({
    page,
  }) => {
    const button = await commentsButton(page);
    const url = page.url();
    const length = await historyLength(page);
    const main = await mainInstance(page);
    const scroll = await mainScrollTop(page);

    await button.tap();
    await expect(page.getByTestId('feed-mobile-detail')).toBeVisible();
    await expect(page.getByTestId('feed-mobile-detail-comments-title')).toBeVisible();
    expect(page.url(), 'Vrstva komentárov zmenila adresu').toBe(url);
    expect(await historyLength(page), 'Vrstva komentárov pridala záznam do histórie').toBe(length);
    await expectSameMain(page, main, 'otvorenie vrstvy');

    await page.getByTestId('feed-mobile-detail-close').tap();
    await expect(page.getByTestId('feed-mobile-detail')).toBeHidden();
    expect(page.url(), 'Zatvorenie vrstvy zmenilo adresu').toBe(url);
    expect(await historyLength(page), 'Zatvorenie vrstvy zmenilo históriu').toBe(length);
    await expectSameMain(page, main, 'zatvorenie vrstvy');
    await expect
      .poll(() => mainScrollTop(page), { message: 'Zatvorenie vrstvy posunulo Nástenku' })
      .toBe(scroll);
  });

  test('the full detail page opens straight from its address and Domov returns to the feed', async ({ page }) => {
    const postId = await page.evaluate(async () => {
      const response = await fetch('/api/auth/feed/posts/', { credentials: 'include' });
      const data = await response.json();
      const posts = Array.isArray(data) ? data : (data.results ?? []);
      return typeof posts[0]?.id === 'number' ? (posts[0].id as number) : null;
    });
    expect(postId, 'Príprava: účet nemá žiadny príspevok na Nástenke.').not.toBeNull();

    await page.goto(`/dashboard/feed/${postId}`);
    await expect(page.getByTestId('feed-post-detail')).toBeVisible();
    expect(pathOf(page)).toBe(`/dashboard/feed/${postId}`);

    await bottomNav(page, 'Domov').tap();
    await expect.poll(() => FEED_HOME_PATHS.has(pathOf(page))).toBe(true);
    await expect(page.getByTestId('feed-list')).toBeVisible();
  });
});

test.describe('desktop', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'webkit-mobile', 'Overlay detailu príspevku je len na desktope.');
    await recordMainInstance(page);
    await gotoDashboardHome(page);
  });

  test('comments open as an overlay above the feed and close by the button, by Back and by Escape', async ({
    page,
  }) => {
    const overlay = page.getByTestId('feed-post-overlay');
    const main = await mainInstance(page);
    const length = await historyLength(page);

    const open = async () => {
      await (await commentsButton(page)).click();
      await expect(overlay).toBeVisible();
    };
    const expectClosedOnFeed = async (label: string) => {
      await expect(overlay).toBeHidden();
      await expect
        .poll(() => FEED_HOME_PATHS.has(pathOf(page)), { message: `${label}: adresa nie je Nástenka` })
        .toBe(true);
      await expect(page.getByTestId('feed-list')).toBeVisible();
      await expectSameMain(page, main, label);
    };

    await open();
    expect(pathOf(page), 'Overlay nemá adresu detailu').toMatch(/^\/dashboard\/feed\/\d+$/);
    expect(await historyLength(page), 'Overlay nepridal záznam do histórie').toBe(length + 1);
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(page.getByTestId('feed-post-overlay-layer')).toBeVisible();
    await expect(page.getByTestId('feed-list')).toBeVisible();
    await expectSameMain(page, main, 'otvorenie overlaya');

    await page.getByTestId('feed-post-overlay-close').click();
    await expectClosedOnFeed('zatvorenie tlačidlom');

    await open();
    await page.goBack();
    await expectClosedOnFeed('Späť prehliadača');

    await open();
    await page.keyboard.press('Escape');
    await expectClosedOnFeed('Escape');
  });
});
