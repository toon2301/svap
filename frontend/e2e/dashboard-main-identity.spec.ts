import { expect, test, type Page } from '@playwright/test';

// `<main data-dashboard-main>` dostáva nový DOM element pri KAŽDEJ zmene
// modulu (`useDashboardMainKey`) – nielen okolo profilu a Nástenky, ktoré rieši
// `profile-entry-scroll.spec.ts`. Namerané na iPhone (?debugscroll=1): iOS si
// pozíciu scrollovacieho elementu drží mimo JavaScriptu, takže opakovane
// použitý `<main>` si vedel „pamätať" starú pozíciu aj po zápise z appky;
// čerstvý element takú pamäť nemá.
//
// Test len prechádza spodným menu (mobil) a overuje IDENTITU elementu –
// nekontroluje obsah jednotlivých modulov (to majú vlastné testy). Nič
// nevytvára ani nemení.

const MAIN = '[data-dashboard-main]';
const HOME = 'button[aria-label="Domov"]';

/** Značí každý `<main>` narastajúcim počítadlom – viac v profile-entry-scroll.spec.ts. */
async function recordMainInstance(page: Page) {
  await page.addInitScript(() => {
    let counter = 0;
    const tag = (main: Element | null) => {
      if (main && !main.hasAttribute('data-main-instance')) {
        counter += 1;
        main.setAttribute('data-main-instance', String(counter));
      }
    };
    tag(document.querySelector('[data-dashboard-main]'));
    // `document.documentElement` v čase addInitScript ešte neexistuje (beží
    // pred parsovaním HTML) – `document` samotný áno.
    new MutationObserver(() => tag(document.querySelector('[data-dashboard-main]'))).observe(document, {
      subtree: true,
      childList: true,
    });
  });
}

async function mainInstance(page: Page): Promise<string | null> {
  return page.locator(MAIN).getAttribute('data-main-instance');
}

/** Ťukne na položku spodného menu a počká, kým `<main>` dostane nový element. */
async function tapAndExpectNewMain(page: Page, label: string, selector: string) {
  const before = await mainInstance(page);
  await page.locator(selector).tap();
  await expect
    .poll(() => mainInstance(page), { message: `${label}: <main> nedostal nový element`, timeout: 10_000 })
    .not.toBe(before);
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'Prechody spodným menu na iPhone – len webkit-mobile.');
  await recordMainInstance(page);
  await page.goto('/dashboard');
  await expect(page.getByTestId('feed-list')).toBeVisible();
});

test('every bottom-nav transition lands on a brand-new <main>, back on Domov too', async ({ page }) => {
  const stops: Array<[string, string]> = [
    ['Hľadať', 'button[aria-label="Hľadať"]'],
    ['Správy', 'button[aria-label="Správy"]'],
    ['Spolupráce', 'button[aria-label="Spolupráce"]'],
    ['Upozornenia', 'button[aria-label="Upozornenia"]'],
    ['Domov', HOME],
  ];
  for (const [label, selector] of stops) {
    await tapAndExpectNewMain(page, label, selector);
  }
  // Späť na Domov po celom okruhu je stále znovu čerstvý element (nie ten
  // prvý, s ktorým stránka štartovala).
  await expect(page.getByTestId('feed-list')).toBeVisible();
});
