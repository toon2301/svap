import { expect, test, type Page } from '@playwright/test';

import {
  bottomNav,
  expectNewMain,
  expectSameMain,
  gotoDashboardHome,
  mainInstance,
  pathOf,
  recordMainInstance,
  searchOf,
  sideNav,
} from './support/dashboard';
import { FEED_HOME_PATHS } from './support/feed';

// Klik na upozornenie vedie na príspevok, Späť sa vráti. Klikajú sa VÝLUČNE prečítané upozornenia –
// klik na neprečítané by do produkcie zapísal „prečítané". Bez takého upozornenia sa test preskočí.

const FEED_NOTIFICATIONS = [
  { name: 'like', title: 'Páči sa mi tvoj príspevok', commentTarget: false },
  { name: 'comment', title: 'Komentár k príspevku', commentTarget: true },
  { name: 'reply', title: 'Odpoveď na komentár', commentTarget: true },
] as const;

/** Prečítaná položka = bez fialovej bodky neprečítaného; titulok je v sr-only texte. */
function readNotification(page: Page, title: string) {
  return page
    .locator('button')
    .filter({ has: page.locator('.sr-only', { hasText: title }) })
    .filter({ hasNot: page.locator('span.bg-purple-600') })
    .first();
}

/** Počká na prečítanú položku daného typu; ak žiadna nie je, test preskočí (nikdy neklikne na neprečítanú). */
async function readNotificationOrSkip(page: Page, title: string) {
  const item = readNotification(page, title);
  const found = await item.waitFor({ state: 'visible', timeout: 15_000 }).then(
    () => true,
    () => false,
  );
  test.skip(!found, `Účet nemá PREČÍTANÉ upozornenie „${title}" – klik na neprečítané by zapísal „prečítané".`);
  return item;
}

function expectPostTarget(page: Page, commentTarget: boolean) {
  expect(pathOf(page), 'Upozornenie nevedie na príspevok').toMatch(/^\/dashboard\/feed\/\d+$/);
  if (commentTarget) {
    expect(searchOf(page), 'Upozornenie na komentár nenesie cieľový komentár').toMatch(/^\?comment=\d+$/);
  } else {
    expect(searchOf(page), 'Upozornenie na lajk nemá mať cieľový komentár').not.toContain('comment=');
  }
}

test.describe('mobil', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'webkit-mobile', 'Upozornenia ako stránka – len webkit-mobile.');
    await recordMainInstance(page);
    await gotoDashboardHome(page);
  });

  for (const { name, title, commentTarget } of FEED_NOTIFICATIONS) {
    test(`a read "${name}" notification opens the post page and Back returns to the list with a fresh <main>`, async ({
      page,
    }) => {
      const heading = page.getByRole('heading', { level: 1, name: 'Upozornenia' }).first();

      await bottomNav(page, 'Upozornenia').tap();
      await expect.poll(() => pathOf(page), { message: 'Upozornenia: nesprávna adresa' }).toBe(
        '/dashboard/notifications',
      );
      await expect(heading).toBeVisible();

      const item = await readNotificationOrSkip(page, title);
      await item.tap();
      await expect.poll(() => pathOf(page).startsWith('/dashboard/feed/'), { message: 'Klik nešiel na príspevok' }).toBe(
        true,
      );
      expectPostTarget(page, commentTarget);
      await expect(page.getByTestId('feed-post-detail')).toBeVisible();

      const detailMain = await mainInstance(page);
      await page.goBack();
      await expect.poll(() => pathOf(page), { message: 'Späť: nevrátilo na upozornenia' }).toBe(
        '/dashboard/notifications',
      );
      await expect(heading).toBeVisible();
      await expectNewMain(page, detailMain, 'Späť na upozornenia');
    });
  }
});

test.describe('desktop', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'webkit-mobile', 'Panel upozornení a overlay sú len na desktope.');
    await recordMainInstance(page);
    await gotoDashboardHome(page);
  });

  for (const { name, title, commentTarget } of FEED_NOTIFICATIONS) {
    test(`a read "${name}" notification opens the post overlay and Back closes it without touching <main>`, async ({
      page,
    }) => {
      const overlay = page.getByTestId('feed-post-overlay');
      const main = await mainInstance(page);

      await sideNav(page, 'Upozornenia').click();
      await expect(page.getByRole('heading', { level: 1, name: 'Upozornenia' }).first()).toBeVisible();

      const item = await readNotificationOrSkip(page, title);
      await item.click();
      await expect(overlay).toBeVisible();
      expectPostTarget(page, commentTarget);
      await expectSameMain(page, main, 'otvorenie overlaya z upozornení');

      await page.goBack();
      await expect(overlay).toBeHidden();
      await expect
        .poll(() => FEED_HOME_PATHS.has(pathOf(page)), { message: 'Späť z overlaya: adresa nie je Nástenka' })
        .toBe(true);
      await expectSameMain(page, main, 'Späť z overlaya');
    });
  }
});
