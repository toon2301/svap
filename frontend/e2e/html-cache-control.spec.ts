import { test } from './support/diagnostic-test';
import { assertHtmlNoStore } from './support/html-cache-control';

// Kontroluje sa odpoveď servera, nie syntetická či uložená odpoveď service workera.
test.use({ serviceWorkers: 'block' });

const routes = [
  { path: '/', anonymous: true },
  { path: '/about', anonymous: true },
  { path: '/faq', anonymous: true },
  { path: '/contact', anonymous: true },
  { path: '/dashboard', anonymous: false },
  { path: '/search', anonymous: false },
] as const;

for (const route of routes) {
  test.describe(`Cache-Control HTML ${route.path}`, () => {
    if (route.anonymous) test.use({ storageState: { cookies: [], origins: [] } });

    test('prvé otvorenie aj F5 vrátia dokument s no-store', async ({ page, baseURL }) => {
      if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
        throw new Error('Produkčná kontrola HTML je určená iba pre dohodnuté nasadenie Railway.');
      }
      const expectedUrl = new URL(route.path, baseURL).href;
      await assertHtmlNoStore(await page.goto(route.path, { waitUntil: 'domcontentloaded' }), expectedUrl);
      await assertHtmlNoStore(await page.reload({ waitUntil: 'domcontentloaded' }), expectedUrl);
    });
  });
}
