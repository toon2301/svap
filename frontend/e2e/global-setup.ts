import { chromium, type FullConfig } from '@playwright/test';
import { refreshStorageState } from './support/refreshStorageState';
import { startSessionKeeper } from './support/sessionKeeper';
import { createSessionDiagnostics } from './support/session-diagnostics';
import { captureWithin } from './support/evidence-deadline';

const REQUIRED_ENV = ['E2E_TEST_EMAIL', 'E2E_TEST_PASSWORD'] as const;

// Prihlási sa RAZ cez skutočný formulár (CSRF si appka rieši sama) a uloží
// storage state, z ktorého štartujú všetky testy. Údaje idú len z prostredia
// a nesmú skončiť v žiadnom výstupe — preto tu nebeží trace ani screenshoty
// a pri chybe sa vypíše len pevný výsledok, nikdy text formulára. Pri zlyhaní sa neskúša znova: backend
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
      throw new Error(
        `Prihlásenie zlyhalo (${outcome}). Skontroluj údaje v .env.e2e.`,
      );
    }

    await page.context().storageState({ path: storageState as string });
  } finally {
    await browser.close();
  }

  // Prihlásenie platí 15 minút a jeho obnova je jednorazová, takže bez strážcu by po približne 15 minútach všetky testy
  // štartovali s neplatným prihlásením (nález 202). Strážca ho počas behu obnovuje a súbor prepisuje.
  const seconds = Number(process.env.E2E_SESSION_KEEPER_SECONDS);
  const diagnostics = await captureWithin(() => createSessionDiagnostics(storageState as string), 1000);
  const keeper = startSessionKeeper({
    storageStatePath: storageState as string,
    intervalMs: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined,
    diagnostics: diagnostics ?? undefined,
    refresh: () => refreshStorageState({
      baseURL: baseURL as string,
      storageStatePath: storageState as string,
      onResponseStatus: (status) => diagnostics?.record({ kind: 'refresh-response', status }),
    }),
  });
  return async () => {
    await keeper.stop();
    if (diagnostics) await captureWithin(() => diagnostics.flush(), 1000);
  };
}
