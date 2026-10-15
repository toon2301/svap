import { expect, test, type Page } from '@playwright/test';

import { gotoDashboardHome, pathOf } from './support/dashboard';

// Mobilné Nastavenia: riadok „Sledovanie“ sa otvára a zatvára plynulým posunom, nie tvrdým strihom.
// Ostatné riadky sa vysúvajú plynulo; „Sledovanie“ je samostatné prekrytie, ktoré sa predtým objavilo a zmizlo
// naraz, takže prechod blikal. Iba čítanie – otvorí sa len zoznam sledovaní, nič sa nevytvára ani nemení.

const SCREEN = '[data-testid="offer-watch-mobile-screen"]';

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

test('the Sledovanie row slides in from the right and slides out again on Back, instead of cutting', async ({ page }) => {
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
