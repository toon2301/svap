import { expect, test, type Page } from '@playwright/test';

// These tests use only the designated E2E account. Password entry is never
// recorded in a trace or screenshot; no account data is created or deleted.
test.use({ trace: 'off', screenshot: 'off' });

const EMPTY_STORAGE = { cookies: [], origins: [] };

/** Assert that the browser is on the public login screen with no dashboard content. */
async function expectPublicLogin(page: Page) {
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#login-email')).toBeVisible();
  await expect(page.locator('[data-dashboard-main]')).toHaveCount(0);
}

/** Log out through the utility menu appropriate to the current viewport. */
async function logoutFromDashboard(page: Page, mobile: boolean) {
  if (mobile) {
    await page.locator('button[aria-label="Profil"]').first().click();
    await page.locator('button[aria-label="Menu"]').first().click();
    await page.locator('[data-mobile-settings-scroll]').getByRole('button', { name: 'Viac' }).click();
    await page.getByRole('dialog', { name: 'Viac' }).getByRole('button', { name: 'Odhlásiť sa' }).click();
    return;
  }

  const sidebar = page.locator('[data-sidebar="left"]');
  await sidebar.getByRole('button', { name: 'Viac' }).click();
  await sidebar.getByRole('button', { name: 'Odhlásiť sa' }).click();
}

test.describe('anonymous session', () => {
  test.use({ storageState: EMPTY_STORAGE });

  test('a direct visit to the dashboard redirects to the login page', async ({ page }) => {
    await page.goto('/dashboard');
    await expectPublicLogin(page);
  });

  test('login, logout, Back and reload never restore a protected page', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.locator('#login-email').fill(process.env.E2E_TEST_EMAIL!);
    await page.locator('#login-password').fill(process.env.E2E_TEST_PASSWORD!);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
    await expect(page.locator('[data-dashboard-main]')).toBeVisible();

    await logoutFromDashboard(page, testInfo.project.name === 'webkit-mobile');
    await expectPublicLogin(page);

    await page.goBack();
    await expectPublicLogin(page);
    await page.reload();
    await expectPublicLogin(page);
    await page.goto('/dashboard');
    await expectPublicLogin(page);
  });
});

test('a cleared cookie session cannot survive a full reload', async ({ page, context }) => {
  await page.goto('/dashboard');
  await expect(page.locator('[data-dashboard-main]')).toBeVisible();

  await context.clearCookies();
  await page.reload();

  await expectPublicLogin(page);
});
