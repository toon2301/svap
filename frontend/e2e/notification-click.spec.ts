import { expect, test, type Locator, type Page } from '@playwright/test';

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
// Upozornenie môže ostať aj po zmazaní príspevku (adresu skladá backend z uloženého ID bez kontroly) –
// aplikácia takýto cieľ správne odmietne, preto sa pred klikom cez API overí, že príspevok existuje.

/** Prvá stránka zoznamu upozornení má v aplikácii 15 položiek (`useNotificationsFeed`). */
const NOTIFICATIONS_PAGE_SIZE = 15;

const FEED_NOTIFICATIONS = [
  { name: 'like', type: 'feed_post_liked', title: 'Páči sa mi tvoj príspevok', commentTarget: false },
  { name: 'comment', type: 'feed_post_commented', title: 'Komentár k príspevku', commentTarget: true },
  { name: 'reply', type: 'feed_post_comment_replied', title: 'Odpoveď na komentár', commentTarget: true },
] as const;

/** Viditeľné prečítané položky daného typu v poradí zoznamu; prečítaná = bez fialovej bodky neprečítaného, titulok je v sr-only texte. */
function readNotifications(page: Page, title: string): Locator {
  return page
    .locator('button')
    .filter({ has: page.locator('.sr-only', { hasText: title }) })
    .filter({ hasNot: page.locator('span.bg-purple-600') })
    .filter({ visible: true });
}

/** Čisté čítanie API: adresy cieľov PREČÍTANÝCH upozornení daného typu z prvej stránky zoznamu, v poradí zoznamu. */
async function readNotificationTargets(page: Page, type: string): Promise<string[]> {
  return page.evaluate(
    async ({ wanted, pageSize }) => {
      const response = await fetch(`/api/auth/notifications/?type=all&page=1&page_size=${pageSize}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Príprava: zoznam upozornení vrátil HTTP ${response.status}.`);
      const data = await response.json().catch(() => null);
      const items: Array<{ type?: string; is_read?: boolean; target_url?: string | null }> = data?.results ?? [];
      return items
        .filter((item) => item.type === wanted && item.is_read === true)
        .map((item) => item.target_url ?? '');
    },
    { wanted: type, pageSize: NOTIFICATIONS_PAGE_SIZE },
  );
}

/** Index prvej adresy, ktorej príspevok ešte existuje (čisté GET čítanie), inak -1. */
async function firstLivePostIndex(page: Page, targets: string[]): Promise<number> {
  return page.evaluate(async (urls) => {
    for (let index = 0; index < urls.length; index += 1) {
      const postId = /^\/dashboard\/feed\/(\d+)(?:\?|$)/.exec(urls[index])?.[1];
      if (!postId) continue;
      const response = await fetch(`/api/auth/feed/posts/${postId}/`, { credentials: 'include' });
      if (response.ok) return index;
      if (![403, 404, 410].includes(response.status)) {
        throw new Error(`Príprava: detail príspevku vrátil HTTP ${response.status}.`);
      }
    }
    return -1;
  }, targets);
}

/** Prečítané upozornenie daného typu s existujúcim príspevkom; inak test preskočí (nikdy neklikne na neprečítané ani na zmazaný cieľ). */
async function liveReadNotificationOrSkip(page: Page, type: string, title: string): Promise<Locator> {
  const candidates = readNotifications(page, title);
  let targets: string[] = [];
  await expect
    .poll(
      async () => {
        targets = await readNotificationTargets(page, type);
        return (await candidates.count()) === targets.length;
      },
      { message: `Upozornenia „${title}": zoznam na stránke nesedí s API`, timeout: 15_000 },
    )
    .toBe(true);
  test.skip(targets.length === 0, `Účet nemá PREČÍTANÉ upozornenie „${title}" – klik na neprečítané by zapísal „prečítané".`);

  const live = await firstLivePostIndex(page, targets);
  test.skip(live < 0, `Všetky PREČÍTANÉ upozornenia „${title}" vedú na zmazaný alebo nedostupný príspevok.`);
  return candidates.nth(live);
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

  for (const { name, type, title, commentTarget } of FEED_NOTIFICATIONS) {
    test(`a read "${name}" notification opens the post page and Back returns to the list with a fresh <main>`, async ({
      page,
    }) => {
      const heading = page.getByRole('heading', { level: 1, name: 'Upozornenia' }).first();

      await bottomNav(page, 'Upozornenia').tap();
      await expect.poll(() => pathOf(page), { message: 'Upozornenia: nesprávna adresa' }).toBe(
        '/dashboard/notifications',
      );
      await expect(heading).toBeVisible();

      const item = await liveReadNotificationOrSkip(page, type, title);
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

  for (const { name, type, title, commentTarget } of FEED_NOTIFICATIONS) {
    test(`a read "${name}" notification opens the post overlay and Back closes it without touching <main>`, async ({
      page,
    }) => {
      const overlay = page.getByTestId('feed-post-overlay');
      const main = await mainInstance(page);

      await sideNav(page, 'Upozornenia').click();
      await expect(page.getByRole('heading', { level: 1, name: 'Upozornenia' }).first()).toBeVisible();

      const item = await liveReadNotificationOrSkip(page, type, title);
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
