import { expect, type Page } from '@playwright/test';
import { gotoDashboardHome } from './dashboard';
import { ownProfilePaths, type OwnProfilePaths, matchesAppPath } from './own-profile-paths';

/** Načíta len identitu vlastného účtu; odpoveď, ID ani slug nevkladá do chýb alebo príloh. */
export async function readOwnProfilePaths(page: Page): Promise<OwnProfilePaths> {
  await gotoDashboardHome(page);
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/auth/me/', { credentials: 'include' });
    const data = await response.json().catch(() => null);
    return {
      status: response.status,
      identity: data && typeof data === 'object' && !Array.isArray(data)
        ? { id: data.id, slug: data.slug } : null,
    };
  });
  if (result.status !== 200) throw new Error(`Príprava vlastného profilu zlyhala: HTTP ${result.status}.`);
  return ownProfilePaths(result.identity);
}

/** Overí správnu sekciu bez vypísania skutočného identifikátora do chyby URL asercie. */
export async function expectAppPath(page: Page, expectedPath: string, appOrigin: string): Promise<void> {
  await expect.poll(() => matchesAppPath(page.url(), expectedPath, appOrigin), {
    message: 'Aplikácia nezostala na očakávanej doméne a ceste sekcie.',
  }).toBe(true);
}
