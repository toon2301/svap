import { expect, test } from './support/diagnostic-test';

// Jazyk mení iba izolovaný localStorage, nikdy účet. Žiadne testovacie dáta nevznikajú.
test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' });

for (const locale of ['sk', 'cs', 'en', 'pl', 'de', 'hu'] as const) {
  test(`HTML lang po načítaní zodpovedá appLocale ${locale}`, async ({ page, baseURL }) => {
    if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
      throw new Error('Kontrola jazyka je určená pre dohodnuté nasadenie Railway.');
    }
    await page.addInitScript(language => { localStorage.setItem('appLocale', language); }, locale);
    await page.goto('/');
    // Server začína so sk. Štandardná čakajúca asercia dovolí dokončiť efekt LanguageProvider.
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
  });
}
