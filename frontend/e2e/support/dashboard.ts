import { expect, type Locator, type Page } from '@playwright/test';

import { FEED_HOME_PATHS } from './feed';

// Spoločné pomôcky pre E2E testy navigácie Dashboardu (história, <main>, menu).

export const MAIN = '[data-dashboard-main]';

/** Značí každý `<main>` narastajúcim počítadlom (nový element = nové číslo). Volať PRED `page.goto`. */
export async function recordMainInstance(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let counter = 0;
    const tag = (main: Element | null) => {
      if (main && !main.hasAttribute('data-main-instance')) {
        counter += 1;
        main.setAttribute('data-main-instance', String(counter));
      }
    };
    tag(document.querySelector('[data-dashboard-main]'));
    // `document.documentElement` v čase addInitScript ešte neexistuje – `document` samotný áno.
    new MutationObserver(() => tag(document.querySelector('[data-dashboard-main]'))).observe(document, {
      subtree: true,
      childList: true,
    });
  });
}

export async function mainInstance(page: Page): Promise<string | null> {
  return page.locator(MAIN).getAttribute('data-main-instance');
}

/** Počká, kým `<main>` dostane iný element než `before`. */
export async function expectNewMain(page: Page, before: string | null, label: string): Promise<void> {
  await expect
    .poll(() => mainInstance(page), { message: `${label}: <main> nedostal nový element`, timeout: 10_000 })
    .not.toBe(before);
}

export async function expectSameMain(page: Page, before: string | null, label: string): Promise<void> {
  expect(await mainInstance(page), `${label}: <main> sa nemal vymeniť`).toBe(before);
}

export async function mainScrollTop(page: Page): Promise<number> {
  return page.locator(MAIN).evaluate((element) => Math.round(element.scrollTop));
}

export async function historyLength(page: Page): Promise<number> {
  return page.evaluate(() => history.length);
}

export function pathOf(page: Page): string {
  return new URL(page.url()).pathname;
}

export function searchOf(page: Page): string {
  return new URL(page.url()).search;
}

export async function gotoDashboardHome(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await expect(page.getByTestId('feed-list')).toBeVisible();
}

/** Vykoná krok a overí adresu, obsah a čerstvý <main>. */
export async function landOn(
  page: Page,
  step: { label: string; path: string; anchor: () => Promise<unknown>; act: () => Promise<unknown> },
): Promise<void> {
  const before = await mainInstance(page);
  await step.act();
  await expect.poll(() => pathOf(page), { message: `${step.label}: nesprávna adresa` }).toBe(step.path);
  await step.anchor();
  await expectNewMain(page, before, step.label);
}

/** Ako `landOn`, ale cieľom je Nástenka (`/dashboard`, `/dashboard/home`). */
export async function landOnHome(page: Page, label: string, act: () => Promise<unknown>): Promise<void> {
  const before = await mainInstance(page);
  await act();
  await expect
    .poll(() => FEED_HOME_PATHS.has(pathOf(page)), { message: `${label}: adresa nie je Nástenka` })
    .toBe(true);
  await expect(page.getByTestId('feed-list')).toBeVisible();
  await expectNewMain(page, before, label);
}

/** Spodné menu na mobile (Domov, Hľadať, Správy, Spolupráce, Upozornenia). */
export function bottomNav(page: Page, label: string): Locator {
  return page.locator(`[data-mobile-bottom-nav] button[aria-label="${label}"]`);
}

/** Ľavé menu na desktope; regex znáša aj odznak s počtom v názve tlačidla. */
export function sideNav(page: Page, label: string): Locator {
  return page
    .locator('aside, nav')
    .getByRole('button', { name: new RegExp(`^${label}(?:\\s|$)`) })
    .first();
}

/** Prvý VIDITEĽNÝ prvok s daným placeholderom (druhé rozloženie môže byť v DOM skryté). */
export function visiblePlaceholder(page: Page, text: RegExp): Locator {
  return page.getByPlaceholder(text).filter({ visible: true }).first();
}

/** Tlačidlo „Späť" v hornej lište mobilu. */
export function topBarBack(page: Page): Locator {
  return page.locator('button[aria-label="Späť"]').first();
}
