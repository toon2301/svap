import { expect, test } from '@playwright/test';

// Overí, že storage state z globalSetup naozaj prihlasuje. Neprihláseného
// dashboard vráti na "/"; <main data-dashboard-main> sa vykreslí iba
// s prihláseným používateľom (desktop aj mobil).
test('prihlásený používateľ vidí dashboard', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.locator('main[data-dashboard-main]')).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard/);
});
