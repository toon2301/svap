import { expect, test, type Locator, type Page, type Request } from '@playwright/test';

import { bottomNav, gotoDashboardHome, MAIN, pathOf, sideNav } from './support/dashboard';
import { loadMoreSentinel, loadMoreSkeleton, notificationRows } from './support/notifications';

// Zoznam upozornení sa pri scrolle donačítava sám (bez tlačidla „Zobraziť ďalšie“): mobil ako
// stránka, desktop v paneli pri ľavej navigácii. Test iba číta a scrolluje, nič nezapisuje (žiadne
// kliknutie na upozornenie, takže sa nič neoznačí ako prečítané). Účet s jednou dávkou upozornení
// (do 15) nemá čo donačítavať, preto sa preskočí.

const FIRST_BATCH = 15;
/** Koľko upozornení sa najviac donačíta: stačia tri dávky, nie celá história veľkého účtu. */
const TARGET_ROWS = 45;

/** Donačítanie ďalšej dávky: `GET .../auth/notifications/?type=all&page=N&page_size=15` pre N >= 2. */
function isLoadMoreRequest(request: Request): boolean {
  return (
    request.method() === 'GET' &&
    /\/auth\/notifications\/\?(?=.*\bpage=(?:[2-9]|\d{2,})\b)(?=.*\bpage_size=15\b)/.test(request.url())
  );
}

/** Čisté čítanie API: koľko upozornení účet má celkovo. */
async function notificationsTotal(page: Page): Promise<number> {
  return page.evaluate(async (pageSize) => {
    const response = await fetch(`/api/auth/notifications/?type=all&page=1&page_size=${pageSize}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`Príprava: zoznam upozornení vrátil HTTP ${response.status}.`);
    const data = await response.json().catch(() => null);
    return typeof data?.total === 'number' ? data.total : 0;
  }, FIRST_BATCH);
}

/** Sleduje požiadavky pre kontrolu: dávky nesmú ísť dvakrát a test nič nezapisuje. */
function watchRequests(page: Page) {
  const loadMore: string[] = [];
  const writes: string[] = [];
  page.on('request', (request) => {
    if (isLoadMoreRequest(request)) loadMore.push(request.url());
    if (request.method() !== 'GET' && /\/auth\/notifications/.test(request.url())) {
      writes.push(`${request.method()} ${request.url()}`);
    }
  });
  return { loadMore, writes };
}

/** Doscrolluje najbližší scrollovací kontajner na jeho koniec, kým nie je v zozname aspoň `target` riadkov. */
async function scrollUntilRows(scrollParent: Locator, rows: Locator, target: number): Promise<void> {
  await expect
    .poll(
      async () => {
        await scrollParent.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        return rows.count();
      },
      { message: `Zoznam sa pri scrolle nedonačítal na ${target} upozornení`, timeout: 60_000, intervals: [300] },
    )
    .toBeGreaterThanOrEqual(target);
}

async function expectAutoLoading(
  page: Page,
  scrollParent: Locator,
  rows: Locator,
  requests: ReturnType<typeof watchRequests>,
): Promise<void> {
  test.setTimeout(120_000);
  const total = await notificationsTotal(page);
  test.skip(total <= FIRST_BATCH, 'Účet má najviac jednu dávku upozornení – nie je čo donačítavať.');

  // Prvá dávka je pripravená, až keď sú v zozname riadky (nadpis ukazuje aj horná lišta).
  await expect(rows.first()).toBeVisible();
  await expect(page.getByText('Načítavam upozornenia...')).toHaveCount(0);
  // Hľadá sa len v zozname upozornení: na desktope beží pod panelom Nástenka, ktorá má vlastné tlačidlo „Zobraziť ďalšie“.
  const loadMoreButton = scrollParent.getByRole('button', { name: 'Zobraziť ďalšie' });
  await expect(loadMoreButton, 'Tlačidlo „Zobraziť ďalšie“ už nemá existovať').toHaveCount(0);

  const target = Math.min(total, TARGET_ROWS);
  await scrollUntilRows(scrollParent, rows, target);

  // Pri konci zoznamu (všetko je načítané) sentinel aj skeleton zmiznú, inak sa čaká na ďalšie dávky.
  if ((await rows.count()) >= total) {
    await expect(loadMoreSentinel(page)).toHaveCount(0);
    await expect(loadMoreSkeleton(page)).toHaveCount(0);
  }
  await expect(loadMoreButton).toHaveCount(0);

  expect(requests.loadMore.length, 'Aspoň jedna dávka sa mala donačítať').toBeGreaterThan(0);
  expect(new Set(requests.loadMore).size, 'Rovnaká dávka sa načítala viackrát').toBe(requests.loadMore.length);
  expect(requests.writes, 'Test nemá nič zapisovať').toEqual([]);
}

test.describe('mobil', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'webkit-mobile', 'Upozornenia ako stránka – len webkit-mobile.');
    await gotoDashboardHome(page);
  });

  test('scrolling the notifications page loads the next batches by itself, without a button', async ({ page }) => {
    const requests = watchRequests(page); // pred otvorením: prvá donačítaná dávka môže prísť hneď
    await bottomNav(page, 'Upozornenia').tap();
    await expect.poll(() => pathOf(page), { message: 'Upozornenia: nesprávna adresa' }).toBe(
      '/dashboard/notifications',
    );
    const rows = notificationRows(page.locator(`${MAIN} section`));
    await expectAutoLoading(page, page.locator(MAIN), rows, requests);
  });
});

test.describe('desktop', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'webkit-mobile', 'Panel upozornení je len na desktope.');
    await gotoDashboardHome(page);
  });

  test('scrolling the notifications panel loads the next batches by itself, without a button', async ({ page }) => {
    const requests = watchRequests(page); // pred otvorením: prvá donačítaná dávka môže prísť hneď
    await sideNav(page, 'Upozornenia').click();
    const heading = page.getByRole('heading', { level: 1, name: 'Upozornenia' }).first();
    await expect(heading).toBeVisible();
    // Panel je najbližšia `<section>` nad nadpisom; len ona sa v paneli scrolluje.
    const panel = heading.locator('xpath=ancestor::section[1]');
    await expectAutoLoading(page, panel, notificationRows(panel), requests);
  });
});
