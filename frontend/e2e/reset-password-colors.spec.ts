import { expect, test } from './support/diagnostic-test';

// Nález 320, po nasadení K15. Syntetický odkaz, nikdy reálny token ani zmena hesla.
test.use({ serviceWorkers: 'block', storageState: { cookies: [], origins: [] } });

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Zmena hesla – farby ${theme}`, () => {
    test.use({ colorScheme: theme });

    test('WebKit zobrazí oba vstupy svetlé a text čitateľný bez odoslania', async ({ page }, testInfo) => {
      test.skip(!testInfo.project.name.startsWith('webkit-'), 'Regresia systémových farieb WebKitu.');
      let verified = 0;
      let writes = 0;
      await page.route(url => url.pathname.startsWith('/api/'), async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
          writes += 1;
          await route.abort('blockedbyclient');
        } else if (request.method() === 'GET' && path === '/api/auth/password-reset-verify/e2e-uid/e2e-token/') {
          verified += 1;
          await route.fulfill({ status: 200, json: { valid: true } });
        } else {
          await route.continue();
        }
      });
      await page.goto('/reset-password/e2e-uid/e2e-token');
      await expect(page.getByRole('heading', { name: 'Zmena hesla', exact: true })).toBeVisible();
      expect(verified, 'Formulár musí vzniknúť po zachytenom overení odkazu.').toBeGreaterThan(0);
      expect(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).toBe(theme === 'dark');
      for (const selector of ['#password', '#confirmPassword']) {
        const input = page.locator(selector);
        await expect(input).toBeVisible();
        await expect(input).toHaveValue('');
        await expect(input).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        await expect(input).toHaveCSS('color', 'rgb(17, 24, 39)');
      }
      expect(writes, 'Tento scenár nesmie posielať heslo, e-mail ani iný zápis.').toBe(0);
    });
  });
}
