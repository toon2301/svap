import { expect, type Locator, type Page } from '@playwright/test';

// Spoločné pomôcky pre E2E testy zoznamu upozornení (automatické donačítavanie pri scrolle).

/** Koniec zoznamu s automatickým donačítavaním: kým sú ďalšie dávky, je tu sentinel (a počas dávky skeleton). */
export function loadMoreSentinel(page: Page): Locator {
  return page.getByTestId('notifications-load-more-sentinel');
}

export function loadMoreSkeleton(page: Page): Locator {
  return page.getByTestId('notifications-load-more-skeleton');
}

/** Riadky upozornení v danom kontajneri: tlačidlo, ktoré nesie skrytý (sr-only) titulok. */
export function notificationRows(container: Locator): Locator {
  return container.locator('button').filter({ has: container.page().locator('.sr-only') });
}

/**
 * Počká, kým sa zoznam upokojí: nebeží žiadne donačítavanie (žiadny skeleton) a počet riadkov sa
 * `quietMs` nezmenil. Až potom má zmysel registrovať požiadavky alebo merať scroll, inak by sa do
 * merania primiešala dávka, ktorú spustil sentinel.
 */
export async function waitForQuietList(page: Page, rows: Locator, quietMs = 1_500): Promise<void> {
  let lastCount = -1;
  let stableSince = 0;
  await expect
    .poll(
      async () => {
        const count = await rows.count();
        const loading = (await loadMoreSkeleton(page).count()) > 0;
        const now = Date.now();
        if (loading || count !== lastCount) {
          lastCount = count;
          stableSince = now;
          return false;
        }
        return now - stableSince >= quietMs;
      },
      { message: 'Zoznam upozornení sa neupokojil (donačítava sa bez konca)', timeout: 30_000, intervals: [250] },
    )
    .toBe(true);
}
