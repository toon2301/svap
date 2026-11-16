import { expect, type Locator, type Page } from '@playwright/test';
import type { CategoryChange } from './notification-category-roundtrip';
import { CategoryWriteAudit, NOTIFICATION_SETTINGS_PATH, isCategoryPatch } from './notification-category-writes';

/** Obe rozloženia sú v DOM; rozhoduje konkrétny viditeľný obal a tlačidlá, nie globálne texty. */
async function categoryControls(page: Page, isMobile: boolean): Promise<{ on: Locator; off: Locator }> {
  const category = page.getByTestId(`notifications-category-likes-${isMobile ? 'mobile' : 'desktop'}`);
  await expect(category).toBeVisible();
  const on = category.getByRole('button', { name: 'Zapnuté', exact: true });
  const off = category.getByRole('button', { name: 'Vypnuté', exact: true });
  await expect(on).toBeEnabled();
  await expect(off).toBeEnabled();
  return { on, off };
}

/** Fajka patrí len zvolenému tlačidlu, nie ikone nadpisu alebo skrytému druhému rozloženiu. */
async function selected(controls: { on: Locator; off: Locator }, value: boolean): Promise<void> {
  await expect((value ? controls.on : controls.off).locator('svg')).toHaveCount(1);
  await expect((value ? controls.off : controls.on).locator('svg')).toHaveCount(0);
}

/** Skutočná UI zmena a F5. Zachytená odpoveď poskytne len stav, jej telo sa neexportuje. */
export async function exerciseNotificationCategory(
  page: Page, isMobile: boolean, change: CategoryChange, audit: CategoryWriteAudit, actionTimeout: number,
): Promise<void> {
  let phase = 'otvorenie';
  try {
    await page.addInitScript(() => { localStorage.setItem('appLocale', 'sk'); });
    await page.goto(NOTIFICATION_SETTINGS_PATH);
    phase = 'pôvodný výber';
    let controls = await categoryControls(page, isMobile);
    await selected(controls, !change.target);
    phase = 'UI zmena';
    // Odmietnutie je spracované hneď, aj keď tap sám zlyhá; neostane unhandled rejection.
    const response = page.waitForResponse(reply => isCategoryPatch(reply.request()), { timeout: actionTimeout })
      .then(reply => reply.status(), () => 0);
    audit.arm();
    const option = change.target ? controls.on : controls.off;
    if (isMobile) await option.tap();
    else await option.click();
    if (await response !== 200) throw new Error('UI PATCH nebol potvrdený.');
    await selected(controls, change.target);
    audit.assertUIComplete();
    phase = 'GET po zmene';
    await change.verifyPersisted();
    phase = 'obnovenie stránky';
    await page.reload();
    controls = await categoryControls(page, isMobile);
    phase = 'GET po obnovení';
    await change.verifyPersisted();
    phase = 'výber po obnovení';
    await selected(controls, change.target);
    audit.assertUIComplete();
  } catch {
    // Playwright chyby môžu niesť DOM; do reportu patrí iba náš pevný názov kroku.
    throw new Error(`Kontrola UI kategórie neuspela; krok: ${phase}.`);
  }
}
