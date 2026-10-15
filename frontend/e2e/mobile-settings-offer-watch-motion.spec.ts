import { expect, test, type Page } from '@playwright/test';

import { gotoDashboardHome, pathOf } from './support/dashboard';

// Mobilné Nastavenia: riadok „Sledovanie“ sa otvára a zatvára plynulým posunom, nie tvrdým strihom.
// Ostatné riadky sa vysúvajú plynulo; „Sledovanie“ je samostatné prekrytie, ktoré sa predtým objavilo a zmizlo
// naraz, takže prechod blikal. Iba čítanie – otvorí sa len zoznam sledovaní, nič sa nevytvára ani nemení.

const SCREEN = '[data-testid="offer-watch-mobile-screen"]';
/** Spodné menu „Viac“ v pätičke Nastavení (portál mimo obrazovky „Sledovanie“). */
const VIAC_MENU = '[role="dialog"][aria-labelledby="mobile-utility-menu-title"]';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'Mobilné Nastavenia – len webkit-mobile.');
  await gotoDashboardHome(page);
});

type Frame = { left: number | null; pointerEvents: string | null };

/** V stránke zapíše pre každú snímku polohu prekrytia „Sledovanie“ (null = neexistuje). */
async function startRecordingFrames(page: Page): Promise<void> {
  await page.evaluate((selector) => {
    const target = window as unknown as { __frames: Frame[]; __recording: boolean };
    target.__frames = [];
    target.__recording = true;
    const tick = () => {
      const screen = document.querySelector<HTMLElement>(selector);
      target.__frames.push({
        left: screen ? Math.round(screen.getBoundingClientRect().left) : null,
        pointerEvents: screen ? getComputedStyle(screen).pointerEvents : null,
      });
      if (target.__recording) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, SCREEN);
}

async function stopRecordingFrames(page: Page): Promise<Frame[]> {
  return page.evaluate(() => {
    const target = window as unknown as { __frames: Frame[]; __recording: boolean };
    target.__recording = false;
    return target.__frames;
  });
}

/**
 * V stránke zapíše, či obrazovka „Sledovanie“ ešte existovala v okamihu, keď sa do nej pridalo menu „Viac“.
 * Menu si zámok scrollu zapamätá hneď po pridaní (v tej istej úlohe), takže toto je presný okamih súbehu.
 */
async function watchViacMenuOpening(page: Page): Promise<void> {
  await page.evaluate(
    ({ screenSelector, menuSelector }) => {
      const target = window as unknown as { __viacOpening: { screenPresent: boolean } | null };
      target.__viacOpening = null;
      const observer = new MutationObserver(() => {
        if (target.__viacOpening || !document.querySelector(menuSelector)) return;
        target.__viacOpening = { screenPresent: document.querySelector(screenSelector) !== null };
        observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    },
    { screenSelector: SCREEN, menuSelector: VIAC_MENU },
  );
}

async function readViacMenuOpening(page: Page): Promise<{ screenPresent: boolean } | null> {
  return page.evaluate(
    () => (window as unknown as { __viacOpening: { screenPresent: boolean } | null }).__viacOpening,
  );
}

/** Cez vlastný profil a ponuku Menu otvorí zoznam Nastavení a počká, kým sa panel usadí. */
async function openSettingsList(page: Page) {
  const settingsHeading = page.getByRole('heading', { level: 2, name: 'Nastavenia' }).first();
  const rows = page.locator('[data-mobile-settings-scroll]');

  await page.locator('button[aria-label="Profil"]').first().tap();
  await expect.poll(() => pathOf(page), { message: 'Profil: adresa nie je vlastný profil' }).toMatch(
    /^\/dashboard\/users\/[^/]+$/,
  );
  await page.locator('button[aria-label="Menu"]').first().tap();
  await expect.poll(() => pathOf(page), { message: 'Menu: adresa nie sú nastavenia' }).toBe('/dashboard/settings');
  await expect(settingsHeading).toBeVisible();
  // Panel Nastavení sa vysúva pružinou – počkaj, kým sa usadí, a až potom ťukni.
  await expect
    .poll(() => rows.evaluate((el) => Math.round((el.closest('.fixed') ?? el).getBoundingClientRect().left)))
    .toBe(0);
  return { settingsHeading, rows };
}

test('the Sledovanie row slides in from the right and slides out again on Back, instead of cutting', async ({ page }) => {
  const { settingsHeading, rows } = await openSettingsList(page);

  await startRecordingFrames(page);
  await rows.getByRole('button', { name: /^Sledovanie/ }).tap();
  const screen = page.locator(SCREEN);
  await expect(screen, 'Sledovanie: obrazovka sa neotvorila').toBeVisible();
  await expect.poll(() => screen.evaluate((el) => Math.round(el.getBoundingClientRect().left))).toBe(0);
  const opening = (await stopRecordingFrames(page)).filter((frame) => frame.left !== null);
  expect(opening[0]?.left, 'Sledovanie: obrazovka sa objavila hneď na mieste (tvrdý strih), nevsúvala sa sprava').toBeGreaterThan(150);

  await startRecordingFrames(page);
  await screen.locator('button[aria-label="Späť"]').first().tap();
  await expect(screen, 'Sledovanie: obrazovka po Späť nezmizla').toHaveCount(0);
  await expect.poll(() => pathOf(page), { message: 'Späť: nevrátilo na zoznam Nastavení' }).toBe('/dashboard/settings');
  await expect(settingsHeading).toBeVisible();
  const closing = (await stopRecordingFrames(page)).filter((frame) => frame.left !== null);
  const farthest = Math.max(0, ...closing.map((frame) => frame.left ?? 0));
  expect(farthest, 'Späť: obrazovka zmizla naraz, nevysunula sa doprava').toBeGreaterThan(100);
  const sliding = closing.filter((frame) => (frame.left ?? 0) > 20);
  expect(
    sliding.filter((frame) => frame.pointerEvents !== 'none'),
    'Späť: vysúvajúca sa obrazovka zachytáva ťuknutia, ktoré patria Nastaveniam pod ňou',
  ).toEqual([]);
});

test('a quick tap on "Viac" while the Sledovanie screen slides out leaves the page scroll lock balanced', async ({ page }) => {
  const { rows } = await openSettingsList(page);
  const bodyOverflow = () => page.evaluate(() => document.body.style.overflow);
  const baseline = await bodyOverflow();

  await rows.getByRole('button', { name: /^Sledovanie/ }).tap();
  const screen = page.locator(SCREEN);
  await expect(screen, 'Sledovanie: obrazovka sa neotvorila').toBeVisible();
  await expect.poll(() => screen.evaluate((el) => Math.round(el.getBoundingClientRect().left))).toBe(0);
  await expect.poll(bodyOverflow, { message: 'Sledovanie: obrazovka nezamkla scroll stránky' }).toBe('hidden');

  // Výstup trvá ~0,5 s, preto sa poloha „Viac“ zmeria vopred a po Späť sa ťuká surovým dotykom: bez hľadania
  // prvku a kontrol Playwrightu, ktoré by ťuknutie oddialili za koniec výstupu.
  const viacBox = await page.locator('[data-mobile-settings-footer] button').first().boundingBox();
  if (!viacBox) throw new Error('Viac: tlačidlo v pätičke Nastavení nemá polohu');
  await watchViacMenuOpening(page);

  await screen.locator('button[aria-label="Späť"]').first().tap();
  // Hneď ako sa obrazovka začne vysúvať (už nereaguje na ťuknutia), ťukni na „Viac“ v pätičke Nastavení.
  await page.waitForFunction((selector) => {
    const element = document.querySelector<HTMLElement>(selector);
    return element === null || getComputedStyle(element).pointerEvents === 'none';
  }, SCREEN);
  await page.touchscreen.tap(viacBox.x + viacBox.width / 2, viacBox.y + viacBox.height / 2);
  const menu = page.locator(VIAC_MENU);
  await expect(menu, 'Viac: menu sa neotvorilo').toBeVisible();
  // Test platí len vtedy, keď sa menu otvorilo POČAS výstupu; po jeho konci by prešiel aj pokazený kód.
  expect(
    (await readViacMenuOpening(page))?.screenPresent,
    'Viac: menu sa otvorilo až po konci výstupu obrazovky, súbeh zámkov scrollu sa neskúšal (spusti znova)',
  ).toBe(true);
  await expect(screen, 'Sledovanie: obrazovka po Späť nezmizla').toHaveCount(0);

  // Pri otvorenom menu ostáva stránka zamknutá aj po konci výstupu a po jeho zatvorení sa vráti pôvodný stav.
  await expect.poll(bodyOverflow, { message: 'Viac: koniec výstupu odomkol stránku pod otvoreným menu' }).toBe('hidden');
  await menu.getByRole('button', { name: 'Zatvoriť' }).tap();
  await expect(menu).toHaveCount(0);
  await expect.poll(bodyOverflow, { message: 'Viac: po zatvorení menu ostal scroll stránky zamknutý' }).toBe(baseline);
});
