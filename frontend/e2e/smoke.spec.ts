import { expect, test } from '@playwright/test';

// Dymový test: overí, že celý E2E reťazec (config → prehliadač → produkcia)
// funguje. Iba verejná stránka — žiadne prihlásenie ani vytváranie dát.
// Zámerne bez uloženého prihlásenia, inak by "/" presmerovala na dashboard.
test.use({ storageState: { cookies: [], origins: [] } });

test('verejná úvodná stránka sa načíta so správnym titulkom', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/Svaply/);
});
