import { chromium, type FullConfig } from '@playwright/test';

const REQUIRED_ENV = ['E2E_TEST_EMAIL', 'E2E_TEST_PASSWORD'] as const;

// Prihlási sa RAZ cez skutočný formulár (CSRF si appka rieši sama) a uloží
// storage state, z ktorého štartujú všetky testy. Údaje idú len z prostredia
// a nesmú skončiť v žiadnom výstupe — preto tu nebeží trace ani screenshoty
// a text chyby sa pred vypísaním čistí. Pri zlyhaní sa neskúša znova: backend
// po 5 neúspešných pokusoch za 15 min účet dočasne zamkne.
export default async function globalSetup(config: FullConfig) {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Chýba ${missing.join(', ')} — skopíruj .env.e2e.example do .env.e2e a vyplň.`);
  }
  const email = process.env.E2E_TEST_EMAIL!;
  const password = process.env.E2E_TEST_PASSWORD!;
  if (email.endsWith('@example.com')) {
    throw new Error('E2E_TEST_EMAIL má stále hodnotu zo šablóny — vyplň skutočné údaje v .env.e2e.');
  }

  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ baseURL });
    await page.goto('/');

    const loginCard = page.locator('div:has(> form:has(#login-email))');
    await loginCard.locator('#login-email').fill(email);
    await loginCard.locator('#login-password').fill(password);
    await loginCard.locator('button[type="submit"]').click();

    // Úspech = presmerovanie na /dashboard (appka ho robí až po overení
    // session cez /me). Chybová hláška formulára ukončí čakanie hneď.
    const outcome = await Promise.race([
      page.waitForURL(/\/dashboard/).then(() => 'dashboard', () => 'timeout'),
      loginCard.getByRole('alert').first().waitFor().then(() => 'alert', () => 'timeout'),
    ]);

    if (outcome !== 'dashboard') {
      const alerts = await loginCard.getByRole('alert').allInnerTexts().catch(() => []);
      const detail = alerts.join(' | ').split(email).join('***').split(password).join('***');
      throw new Error(
        `Prihlásenie zlyhalo (${outcome}) na ${new URL(page.url()).pathname}` +
          (detail ? ` — hláška formulára: ${detail}` : '') +
          '. Skontroluj údaje v .env.e2e.',
      );
    }

    await page.context().storageState({ path: storageState as string });
  } finally {
    await browser.close();
  }
}
