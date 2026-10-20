import { expect, test, type Locator, type Page } from '@playwright/test';

import { gotoDashboardHome, sideNav } from './support/dashboard';

// Panel upozornení pri ľavej navigácii (desktop): scroll v ňom sa nesmie preniesť na celú aplikáciu.
// Regresia: skryté (sr-only, absolútne pozicované) texty upozornení sa panelu neorezávali, natiahli
// `body` a po scrolle na koniec zoznamu sa posunula celá aplikácia (ľavá navigácia odrezaná zhora,
// pod obsahom prázdna plocha). Test iba číta a scrolluje, nič nezapisuje. Pri zozname kratšom než
// okno nie je čo overovať, preto sa preskočí.

/** Rozmery a posuny dokumentu, podľa ktorých sa pozná „odpojená“ aplikácia. */
async function pageLayout(page: Page) {
  return page.evaluate(() => ({
    innerHeight: window.innerHeight,
    bodyScrollHeight: document.body.scrollHeight,
    bodyScrollTop: Math.round(document.body.scrollTop),
    documentScrollTop: Math.round(document.documentElement.scrollTop),
    windowScrollY: Math.round(window.scrollY),
    navTop: Math.round(document.querySelector('[data-sidebar="left"]')?.getBoundingClientRect().top ?? NaN),
  }));
}

/** Ďalší snímok vykreslenia: scroll z kolesa sa uplatní až v ňom, takže ho treba počkať pred meraním. */
async function settleFrames(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

async function scrollTopOf(panel: Locator): Promise<number> {
  return panel.evaluate((element) => Math.round(element.scrollTop));
}

test.describe('desktop', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'webkit-mobile', 'Panel upozornení je len na desktope.');
    await gotoDashboardHome(page);
  });

  test('scrolling the notifications panel to the end moves only the panel, not the whole app', async ({
    page,
  }) => {
    await sideNav(page, 'Upozornenia').click();
    const heading = page.getByRole('heading', { level: 1, name: 'Upozornenia' }).first();
    await expect(heading).toBeVisible();
    // Panel je najbližšia `<section>` nad nadpisom; len ona sa v paneli scrolluje.
    const panel = heading.locator('xpath=ancestor::section[1]');
    await expect(panel.getByText('Načítavam upozornenia...')).toHaveCount(0);

    const scrollable = await panel.evaluate((element) => element.scrollHeight > element.clientHeight + 1);
    test.skip(!scrollable, 'Zoznam upozornení je kratší než okno – nie je čo scrollovať.');

    const before = await pageLayout(page);
    expect(before.bodyScrollHeight, 'S otvoreným panelom je stránka vyššia než okno').toBeLessThanOrEqual(
      before.innerHeight + 1,
    );

    // Koleso nad zoznamom až na jeho koniec a ešte niekoľko krokov za ním (zvyšok sa prenáša na rodiča).
    await panel.hover();
    await expect
      .poll(
        async () => {
          await page.mouse.wheel(0, 700);
          return panel.evaluate(
            (element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 1,
          );
        },
        { message: 'Panel sa nedal doscrollovať na koniec', timeout: 20_000 },
      )
      .toBe(true);
    for (let step = 0; step < 6; step += 1) await page.mouse.wheel(0, 700);
    await settleFrames(page);

    const after = await pageLayout(page);
    expect(await scrollTopOf(panel), 'Zoznam v paneli sa neposunul').toBeGreaterThan(0);
    expect(after.bodyScrollTop, 'Posunulo sa `body` – aplikácia sa odpojila od okna').toBe(0);
    expect(after.documentScrollTop, 'Posunul sa dokument').toBe(0);
    expect(after.windowScrollY, 'Posunulo sa okno').toBe(0);
    expect(after.navTop, 'Ľavá navigácia je odrezaná zhora').toBe(0);
    expect(after.bodyScrollHeight, 'Po scrolle je stránka vyššia než okno').toBeLessThanOrEqual(
      after.innerHeight + 1,
    );
  });
});
