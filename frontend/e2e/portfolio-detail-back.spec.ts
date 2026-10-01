import { expect, test, type Page } from '@playwright/test';

import { gotoDashboardHome, pathOf, recordMainInstance, searchOf, topBarBack } from './support/dashboard';

// Detail položky vlastného portfólia a Späť do záložky Portfólio. Iba čítanie – nahrávanie ani lajky sa nepoužijú.

const CARD = '[data-testid="portfolio-featured-card"], [data-testid="portfolio-grid-card"]';

async function ownPortfolioItemCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const response = await fetch('/api/auth/portfolio/', { credentials: 'include' });
    const data = await response.json().catch(() => null);
    const items = Array.isArray(data) ? data : (data?.results ?? []);
    return items.length as number;
  });
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'Portfólio na iPhone – len webkit-mobile.');
  await recordMainInstance(page);
  await gotoDashboardHome(page);
});

test('opening a portfolio item and going back returns to the Portfólio tab of the profile', async ({ page }) => {
  expect(
    await ownPortfolioItemCount(page),
    'Príprava: testovací účet nemá žiadnu položku portfólia – vytvor aspoň jednu.',
  ).toBeGreaterThan(0);

  await page.locator('button[aria-label="Profil"]').first().tap();
  await expect.poll(() => pathOf(page)).toMatch(/^\/dashboard\/users\/[^/]+$/);
  const profilePath = pathOf(page);

  const portfolioTab = page.locator('[role="tab"][aria-label="Portfólio"]').first();
  await portfolioTab.tap();
  await expect(portfolioTab).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => searchOf(page)).toContain('tab=portfolio');

  const openFirstItem = async () => {
    const card = page.locator(CARD).first();
    await card.scrollIntoViewIfNeeded();
    await card.locator('button').first().tap();
    const detailPrefix = `${profilePath}/portfolio/`;
    await expect
      .poll(() => pathOf(page).startsWith(detailPrefix) && /^\d+$/.test(pathOf(page).slice(detailPrefix.length)), {
        message: 'Karta portfólia: adresa nie je detail položky',
      })
      .toBe(true);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  };
  const expectBackOnPortfolioTab = async (label: string) => {
    await expect.poll(() => pathOf(page), { message: `${label}: nevrátilo na profil` }).toBe(profilePath);
    expect(searchOf(page), `${label}: stratila sa záložka Portfólio v adrese`).toContain('tab=portfolio');
    await expect(portfolioTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(CARD).first()).toBeVisible();
  };

  await openFirstItem();
  await topBarBack(page).tap();
  await expectBackOnPortfolioTab('Späť v hornej lište');

  await openFirstItem();
  await page.goBack();
  await expectBackOnPortfolioTab('Späť prehliadača');
});
