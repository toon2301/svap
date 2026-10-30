import { expect, test } from './support/diagnostic-test';
import { matchesAppPath } from './support/own-profile-paths';
import { readOwnProfilePaths } from './support/own-profile-fixture';
import sk from '../messages/sk.json';

const RAILWAY_ORIGIN = 'https://stunning-inspiration-svap.up.railway.app';

// Numerický hlboký vstup je samostatný kontrakt aplikácie. Neskrýva sa prechodom
// bežných jazykových testov na kanonický slug, test.fail ani novým skipom chyby.
test.use({ serviceWorkers: 'block', trace: 'off', screenshot: 'off', video: 'off' });

test.describe('Numerický vstup do vlastného jazyka', () => {
  let attemptedWrites: string[];

  test.beforeEach(async ({ page, baseURL }) => {
    if (baseURL !== RAILWAY_ORIGIN) throw new Error('Tento test je určený len pre potvrdené Railway nasadenie.');
    attemptedWrites = [];
    await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
      const request = route.request();
      const refresh = ['/api/token/refresh/', '/api/auth/token/refresh/'].includes(new URL(request.url()).pathname);
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || refresh) await route.continue();
      else { attemptedWrites.push(request.method()); await route.abort(); }
    });
  });

  test.afterEach(() => {
    expect(attemptedWrites, 'Numerická jazyková regresia nesmie meniť údaje účtu.').toEqual([]);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`mobile: ${theme} číselná adresa zachová jazykovú podstránku aj po F5`, async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Samostatná kontrola mobilného hlbokého vstupu.');
      await page.addInitScript((colorTheme) => {
        localStorage.setItem('appLocale', 'sk');
        localStorage.setItem('svaply_theme', colorTheme);
      }, theme);
      const paths = await readOwnProfilePaths(page);
      await page.goto(`${paths.numeric}/language`);
      const expectLanguage = async () => {
        const header = page.locator('div.fixed.top-0.left-0.right-0').filter({ has: page.locator('div.grid.h-12') });
        await expect(header.getByRole('heading', { level: 1, name: 'Jazyk', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Jazyk', exact: true })).toHaveCount(1);
        await expect(header.locator('[data-onboarding="profile-icon"]')).toHaveCount(0);
        for (const key of ['slovak', 'czech', 'english', 'german', 'polish', 'hungarian'] as const) {
          await expect(page.locator('[data-dashboard-main]').getByRole('button', {
            name: sk.language[key], exact: true,
          })).toBeVisible();
        }
        // Overenie URL nasleduje až po obsahu, nie počas úvodnej kanonizácie.
        await expect.poll(() => (
          matchesAppPath(page.url(), `${paths.numeric}/language`, RAILWAY_ORIGIN)
          || matchesAppPath(page.url(), `${paths.canonical}/language`, RAILWAY_ORIGIN)
        ), { message: 'Numerická kanonizácia stratila jazykovú podstránku vlastného profilu.' }).toBe(true);
      };
      await expectLanguage();
      await page.reload();
      await expectLanguage();
    });
  }
});
