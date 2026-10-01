import { expect, test } from '@playwright/test';

import { gotoDashboardHome, pathOf, recordMainInstance, topBarBack } from './support/dashboard';

// Mobilné nastavenia: vstup do sekcie a Späť. Iba čítanie – nič sa neprepína ani neukladá.

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'Mobilné nastavenia – len webkit-mobile.');
  await recordMainInstance(page);
  await gotoDashboardHome(page);
});

test('entering a settings section and going back returns to the settings list, Zatvoriť returns to the profile', async ({
  page,
}) => {
  const settingsHeading = page.getByRole('heading', { level: 2, name: 'Nastavenia' }).first();
  const rows = page.locator('[data-mobile-settings-scroll]');

  await page.locator('button[aria-label="Profil"]').first().tap();
  await expect.poll(() => pathOf(page), { message: 'Profil: adresa nie je vlastný profil' }).toMatch(
    /^\/dashboard\/users\/[^/]+$/,
  );
  const profilePath = pathOf(page);

  await page.locator('button[aria-label="Menu"]').first().tap();
  await expect.poll(() => pathOf(page), { message: 'Menu: adresa nie sú nastavenia' }).toBe('/dashboard/settings');
  await expect(settingsHeading).toBeVisible();

  await rows.getByRole('button', { name: /^Jazyk/ }).tap();
  await expect.poll(() => pathOf(page), { message: 'Jazyk: nesprávna adresa' }).toBe('/dashboard/language');
  await expect(page.getByRole('heading', { level: 2, name: 'Jazyk' }).first()).toBeVisible();

  await topBarBack(page).tap();
  await expect.poll(() => pathOf(page), { message: 'Späť z Jazyka: nesprávna adresa' }).toBe('/dashboard/settings');
  await expect(settingsHeading).toBeVisible();

  await rows.getByRole('button', { name: /^Upozornenia/ }).tap();
  await expect
    .poll(() => pathOf(page), { message: 'Upozornenia: nesprávna adresa' })
    .toBe('/dashboard/settings/notifications');
  await expect(page.getByTestId('notifications-push-messages-mobile')).toBeVisible();

  await page.goBack();
  await expect
    .poll(() => pathOf(page), { message: 'Späť prehliadača z Upozornení: nesprávna adresa' })
    .toBe('/dashboard/settings');
  await expect(settingsHeading).toBeVisible();

  await page.locator('button[aria-label="Zatvoriť"]').first().tap();
  await expect
    .poll(() => pathOf(page), { message: 'Zatvoriť: nevrátilo na vlastný profil' })
    .toBe(profilePath);
});
