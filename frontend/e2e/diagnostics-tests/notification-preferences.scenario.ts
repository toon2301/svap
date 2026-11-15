import { test as preferencesTest } from '../support/notification-preferences-test';
import { NOTIFICATION_PREFERENCE_KEYS as KEYS } from '../support/notification-preferences-roundtrip';

type FailureMode = 'normal' | 'restore-status' | 'restore-shape';
const ORIGIN = 'https://stunning-inspiration-svap.up.railway.app';
const PRIVATE = 'SYNTHETIC_PRIVATE_PREFS_NEVER_PRINT';

/** Všetka sieť sa vybaví lokálne. Žiadny global setup, env ani živé účty. */
const test = preferencesTest.extend<{ failureMode: FailureMode; _syntheticApi: void }>({
  failureMode: ['normal', { option: true }],
  _syntheticApi: [async ({ page, failureMode }, runFixture) => {
    const original = Object.fromEntries(KEYS.map((key, index) => [key, index % 2 === 0]));
    const state = { ...original };
    let gets = 0;
    let patches = 0;
    let csrf = 0;
    let unexpected = 0;
    let csrfPresent = false;
    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      if (url.origin !== ORIGIN) { unexpected += 1; await route.abort(); return; }
      if (url.pathname === '/api/auth/csrf-token/' && method === 'GET') {
        csrf += 1;
        await route.fulfill({ status: 200, contentType: 'application/json',
          headers: { 'Set-Cookie': `csrftoken=${PRIVATE}; Path=/; Secure; SameSite=Lax` },
          body: JSON.stringify({ csrf_token: PRIVATE }) });
      } else if (url.pathname === '/api/auth/push/preferences/' && ['GET', 'PATCH'].includes(method)) {
        if (method === 'GET') gets += 1;
        else {
          patches += 1;
          csrfPresent = Boolean(request.headers()['x-csrftoken']);
          const payload = request.postDataJSON();
          if (patches === 2 && failureMode === 'restore-status') {
            await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ private: PRIVATE }) });
            return;
          }
          Object.assign(state, payload);
          if (patches === 2 && failureMode === 'restore-shape') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ private: PRIVATE }) });
            return;
          }
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...state, private: PRIVATE }) });
      } else if (url.pathname === '/favicon.ico') await route.fulfill({ status: 204 });
      else { unexpected += 1; await route.abort(); }
    });
    try { await runFixture(); } finally {
      // Len pevný stav a počty. Ani syntetický token alebo hodnoty volieb sa nesmú vypísať.
      const restored = KEYS.every(key => state[key] === original[key]);
      console.log(`[PREFERENCES-SELFTEST] mode=${failureMode} restored=${restored} gets=${gets} patches=${patches} csrf=${csrf} csrfPresent=${csrfPresent} unexpected=${unexpected}`);
    }
  }, { auto: true }],
});

test.use({ serviceWorkers: 'block' });

test('riadny návrat po jednej zmene', async ({ verifyPreferenceChange }) => {
  await verifyPreferenceChange();
});

test('chyba tela sa neskončí bez návratu', async ({ verifyPreferenceChange }) => {
  await verifyPreferenceChange();
  throw new Error('SYNTHETIC_BODY_FAILURE');
});

test.describe('chyba obnovovacieho PATCH', () => {
  test.use({ failureMode: 'restore-status' });
  test('zlyhanie fixture zostane FAIL', async ({ verifyPreferenceChange }) => { await verifyPreferenceChange(); });
});

test.describe('neplatná odpoveď obnovy', () => {
  test.use({ failureMode: 'restore-shape' });
  test('obnovený stav nevymaže chybu odpovede', async ({ verifyPreferenceChange }) => { await verifyPreferenceChange(); });
});

test('timeout tela stále vykoná štandardný teardown', async ({ page, verifyPreferenceChange }) => {
  await verifyPreferenceChange();
  await page.waitForTimeout(20_000); // Úmyselný lokálny timeout, nie čakanie produkčného špecu.
});
