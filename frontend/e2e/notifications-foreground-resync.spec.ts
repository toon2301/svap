import { expect, test, type Request } from '@playwright/test';

import {
  bottomNav,
  expectSameMain,
  gotoDashboardHome,
  MAIN,
  mainInstance,
  mainScrollTop,
  pathOf,
  recordMainInstance,
} from './support/dashboard';
import { waitForQuietList } from './support/notifications';

// Mobil: po návrate do popredia sa otvorený zoznam upozornení potichu obnoví. Realtime nič nezopakuje
// (iPhone mu v pozadí spojenie preruší), takže nové upozornenie by sa inak neobjavilo, kým sa sekcia
// neotvorí znova. Test iba číta a nič nezapisuje; nové upozornenie tu nevyvoláva (na produkcii je
// jeden účet), overuje, že návrat spustí práve jednu obnovu okna a že zoznam ostane na mieste a
// neprekreslí sa. Desktopový panel používa ten istý hook a je pokrytý Jest testami.

/** Prvá strana zoznamu upozornení (nie počítadlo): GET `.../auth/notifications/?type=all&page=1&...`. */
function isListRequest(request: Request): boolean {
  return request.method() === 'GET' && /\/auth\/notifications\/\?.*\bpage=1\b/.test(request.url());
}

test.describe('mobil', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'webkit-mobile', 'Upozornenia ako stránka – len webkit-mobile.');
    await recordMainInstance(page);
    await gotoDashboardHome(page);
  });

  test('returning to the foreground refreshes the open notifications list once without remounting it', async ({
    page,
  }) => {
    await bottomNav(page, 'Upozornenia').tap();
    await expect.poll(() => pathOf(page), { message: 'Upozornenia: nesprávna adresa' }).toBe(
      '/dashboard/notifications',
    );
    // Zoznam je pripravený, až keď je v ňom prvé upozornenie (nadpis ukazuje aj horná lišta, nie zoznam).
    const firstItem = page.locator(`${MAIN} section button`).filter({ has: page.locator('.sr-only') }).first();
    await expect(firstItem.or(page.getByText('Zatiaľ nemáte žiadne upozornenia'))).toBeVisible();
    await expect(page.getByText('Načítavam upozornenia...')).toHaveCount(0);
    test.skip((await firstItem.count()) === 0, 'Účet nemá žiadne upozornenia – nie je čo obnovovať.');

    const scrollable = await page
      .locator(MAIN)
      .evaluate((element) => element.scrollHeight - element.clientHeight > 1);
    test.skip(!scrollable, 'Zoznam upozornení je kratší než okno – nie je čo scrollovať.');

    // Trochu odscrolluj a označ si prvý riadok: obnova nesmie zoznam vrátiť hore ani ho prekresliť.
    await page.locator(MAIN).evaluate((element) => {
      element.scrollTop = Math.min(300, element.scrollHeight - element.clientHeight);
    });
    // Odscrollovanie môže spustiť donačítanie ďalšej dávky: počkaj, kým sa zoznam upokojí, a až potom meraj
    // (inak by sa druhá požiadavka `page=1` mohla pripísať dávke a nie návratu do popredia).
    await waitForQuietList(page, page.locator(`${MAIN} section button`).filter({ has: page.locator('.sr-only') }));
    await firstItem.evaluate((element) => element.setAttribute('data-resync-probe', '1'));
    const main = await mainInstance(page);
    const scrollBefore = await mainScrollTop(page);

    const listRequests: string[] = [];
    page.on('request', (request) => {
      if (isListRequest(request)) listRequests.push(request.url());
    });

    // Návrat do popredia: iOS pošle visibilitychange aj focus naraz.
    await page.evaluate(() => {
      const setVisibility = (state: string) =>
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });

    await expect
      .poll(() => listRequests.length, { message: 'Očakávaná presne 1 obnova po návrate do popredia' })
      .toBe(1);
    // visibilitychange + focus sa zlúčili do tej istej obnovy: ani po chvíli nepribudla druhá požiadavka.
    await page.waitForTimeout(1_500);
    expect(listRequests, 'Signály sa nezlúčili do jednej obnovy').toHaveLength(1);

    await expect(page.locator('[data-resync-probe]'), 'Obnova prekreslila zoznam').toHaveCount(1);
    await expectSameMain(page, main, 'obnova po návrate do popredia');
    expect(Math.abs((await mainScrollTop(page)) - scrollBefore), 'Obnova posunula zoznam').toBeLessThanOrEqual(1);
  });
});
