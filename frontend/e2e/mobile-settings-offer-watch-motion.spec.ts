import { expect, test, type Page } from '@playwright/test';

import { gotoDashboardHome, pathOf } from './support/dashboard';

// Mobilné Nastavenia: riadok „Sledovanie“ sa otvára a zatvára ROVNAKO ako ostatné riadky (napr. „Jazyk“): zoznam
// Nastavení sa po ťuknutí odsunie doľava a pod ním stojí hotová obrazovka, pri Späť sa zoznam vráti zľava.
// „Sledovanie“ je samostatné okno nad appkou. Najprv sa objavilo a zmizlo naraz (blikanie), potom sa vsúvalo sprava
// cez stojaci zoznam, teda opačným pohybom než ostatné riadky. Test preto porovnáva priamo s riadkom „Jazyk“.
// Iba čítanie – otvorí sa len zoznam sledovaní a jazyk sa nemení.

const SCREEN = '[data-testid="offer-watch-mobile-screen"]';
const PANEL = '[data-mobile-settings-scroll]';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'Mobilné Nastavenia – len webkit-mobile.');
  await gotoDashboardHome(page);
});

type Frame = { panelLeft: number | null; screenLeft: number | null };

/** V stránke zapíše pre každú snímku ľavý okraj panelu Nastavení a obrazovky „Sledovanie“ (null = neexistuje). */
async function startRecordingFrames(page: Page): Promise<void> {
  await page.evaluate(
    ({ screenSelector, panelSelector }) => {
      const target = window as unknown as { __frames: Frame[]; __recording: boolean };
      target.__frames = [];
      target.__recording = true;
      const tick = () => {
        const panel = document.querySelector<HTMLElement>(panelSelector)?.closest<HTMLElement>('.fixed') ?? null;
        const screen = document.querySelector<HTMLElement>(screenSelector);
        target.__frames.push({
          panelLeft: panel ? Math.round(panel.getBoundingClientRect().left) : null,
          screenLeft: screen ? Math.round(screen.getBoundingClientRect().left) : null,
        });
        if (target.__recording) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    { screenSelector: SCREEN, panelSelector: PANEL },
  );
}

async function stopRecordingFrames(page: Page): Promise<Frame[]> {
  return page.evaluate(() => {
    const target = window as unknown as { __frames: Frame[]; __recording: boolean };
    target.__recording = false;
    return target.__frames;
  });
}

const edgesOf = (frames: Frame[], key: keyof Frame): number[] =>
  frames.map((frame) => frame[key]).filter((value): value is number => value !== null);

/** Cez vlastný profil a ponuku Menu otvorí zoznam Nastavení a počká, kým sa panel usadí. */
async function openSettingsList(page: Page) {
  const settingsHeading = page.getByRole('heading', { level: 2, name: 'Nastavenia' }).first();
  const rows = page.locator(PANEL);

  await page.locator('button[aria-label="Profil"]').first().tap();
  await expect.poll(() => pathOf(page), { message: 'Profil: adresa nie je vlastný profil' }).toMatch(
    /^\/dashboard\/users\/[^/]+$/,
  );
  await page.locator('button[aria-label="Menu"]').first().tap();
  await expect.poll(() => pathOf(page), { message: 'Menu: adresa nie sú nastavenia' }).toBe('/dashboard/settings');
  await expect(settingsHeading).toBeVisible();
  await settledPanel(page);
  return { settingsHeading, rows };
}

/** Ľavý okraj panelu Nastavení práve teraz (null = panel nie je v stránke); nečaká na jeho vznik. */
const panelLeftNow = (page: Page): Promise<number | null> =>
  page.evaluate((selector) => {
    const panel = document.querySelector<HTMLElement>(selector)?.closest<HTMLElement>('.fixed') ?? null;
    return panel ? Math.round(panel.getBoundingClientRect().left) : null;
  }, PANEL);

/** Panel Nastavení sa vsúva pružinou – počká, kým sa usadí na svojom mieste. */
async function settledPanel(page: Page): Promise<void> {
  await expect.poll(() => panelLeftNow(page), { message: 'Nastavenia: panel sa neusadil na svojom mieste' }).toBe(0);
}

const ROWS = [
  {
    label: 'Jazyk',
    // Obrazovka riadka je modul v hlavnej ploche, Späť je šípka v hornej lište.
    arrived: (page: Page) => expect(page.getByRole('heading', { name: 'Jazyk' }).first()).toBeVisible(),
    back: (page: Page) => page.locator('button[aria-label="Späť"]').filter({ visible: true }).first().tap(),
    screenStaysStill: false,
  },
  {
    label: 'Sledovanie',
    // Obrazovka riadka je samostatné okno so svojou šípkou Späť.
    arrived: (page: Page) => expect(page.locator(SCREEN), 'Sledovanie: obrazovka sa neotvorila').toBeVisible(),
    back: (page: Page) => page.locator(SCREEN).locator('button[aria-label="Späť"]').first().tap(),
    screenStaysStill: true,
  },
] as const;

for (const row of ROWS) {
  test(`the ${row.label} row slides the Settings list away to the left and brings it back from the left on Back`, async ({
    page,
  }) => {
    const { rows } = await openSettingsList(page);

    // Otvorenie: zoznam sa odsunie doľava a pod ním je hotová obrazovka riadka.
    await startRecordingFrames(page);
    await rows.getByRole('button', { name: new RegExp(`^${row.label}`) }).tap();
    await row.arrived(page);
    await expect(page.locator(PANEL), `${row.label}: zoznam Nastavení sa po odsunutí neodpojil`).toHaveCount(0);
    const opening = await stopRecordingFrames(page);
    expect(
      Math.min(0, ...edgesOf(opening, 'panelLeft')),
      `${row.label}: zoznam Nastavení sa neodsunul doľava (zmizol naraz)`,
    ).toBeLessThan(-200);
    if (row.screenStaysStill) {
      const screenLefts = edgesOf(opening, 'screenLeft');
      expect(screenLefts.length, `${row.label}: obrazovka sa nikdy neobjavila`).toBeGreaterThan(0);
      expect(Math.max(...screenLefts), `${row.label}: obrazovka sa hýbe, má stáť pod zoznamom`).toBeLessThanOrEqual(1);
    }

    // Späť: zoznam sa vráti zľava a obrazovka riadka zmizne.
    await startRecordingFrames(page);
    await row.back(page);
    await settledPanel(page);
    await expect(page.locator(SCREEN), `${row.label}: obrazovka po Späť nezmizla`).toHaveCount(0);
    await expect.poll(() => pathOf(page), { message: `${row.label}: Späť nevrátilo na zoznam Nastavení` }).toBe(
      '/dashboard/settings',
    );
    const closing = await stopRecordingFrames(page);
    expect(
      Math.min(0, ...edgesOf(closing, 'panelLeft')),
      `${row.label}: zoznam Nastavení neprišiel zľava (objavil sa naraz)`,
    ).toBeLessThan(-200);
  });
}

test('after Back from Sledovanie the page scroll lock is balanced, also for the "Viac" menu opened right away', async ({ page }) => {
  const { rows } = await openSettingsList(page);
  const bodyOverflow = () => page.evaluate(() => document.body.style.overflow);
  const baseline = await bodyOverflow();

  await rows.getByRole('button', { name: /^Sledovanie/ }).tap();
  const screen = page.locator(SCREEN);
  await expect(screen, 'Sledovanie: obrazovka sa neotvorila').toBeVisible();
  await expect.poll(bodyOverflow, { message: 'Sledovanie: obrazovka nezamkla scroll stránky' }).toBe('hidden');

  await screen.locator('button[aria-label="Späť"]').first().tap();
  await expect(screen, 'Sledovanie: obrazovka po Späť nezmizla').toHaveCount(0);
  await expect.poll(bodyOverflow, { message: 'Späť: zámok scrollu ostal po obrazovke' }).toBe(baseline);

  // Menu „Viac“ v pätičke zoznamu, ktorý sa vrátil: zamkne stránku a po zatvorení vráti pôvodný stav.
  await settledPanel(page);
  await page.locator('[data-mobile-settings-footer] button').first().tap();
  const menu = page.getByRole('dialog', { name: 'Viac' });
  await expect(menu, 'Viac: menu sa neotvorilo').toBeVisible();
  await expect.poll(bodyOverflow, { message: 'Viac: otvorené menu nezamklo stránku' }).toBe('hidden');
  await menu.getByRole('button', { name: 'Zatvoriť' }).tap();
  await expect(menu).toHaveCount(0);
  await expect.poll(bodyOverflow, { message: 'Viac: po zatvorení menu ostal scroll stránky zamknutý' }).toBe(baseline);
});
