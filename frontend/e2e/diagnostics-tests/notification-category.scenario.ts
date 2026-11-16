import { test as categoryTest } from '../support/notification-category-test';
import { NOTIFICATION_PREFERENCE_KEYS as KEYS } from '../support/notification-preferences-roundtrip';
import { CATEGORY_ORIGIN as ORIGIN, NOTIFICATION_SETTINGS_PATH, PREFERENCES_PATH } from '../support/notification-category-writes';
import { CATEGORY_MODES, CATEGORY_PRIVATE_MARKER as PRIVATE, syntheticCategoryPage, type CategoryMode } from './notification-category-page';

/** Všetko je lokálna odpoveď; konfigurácia nemá global setup, env alebo účet. */
const test = categoryTest.extend<{ categoryMode: CategoryMode; _syntheticCategory: void }>({
  categoryMode: ['normal-on', { option: true }],
  _syntheticCategory: [async ({ page, categoryMode }, useFixture) => {
    const original = { in_app_notifications: categoryMode !== 'master-off', push_notifications: false,
      notify_likes: categoryMode !== 'normal-off', notify_comment_likes: false, notify_comments: true,
      notify_tags_and_shares: false, notify_skill_requests: true };
    const state = { ...original };
    let gets = 0; let uiPatches = 0; let restores = 0; let documents = 0; let csrf = 0; let unexpected = 0;
    let singleIncoming = 0; let otherIncoming = 0; let restoreIncoming = 0;
    let trustedTouch = 0; let trustedMouse = 0; let csrfPresent = true;
    await page.exposeFunction('recordCategoryPointer', (trusted: boolean, pointer: string) => {
      if (trusted && pointer === 'touch') trustedTouch += 1;
      if (trusted && pointer === 'mouse') trustedMouse += 1;
    });
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== ORIGIN || url.pathname !== PREFERENCES_PATH || request.method() !== 'PATCH') return;
      let fields = 0;
      try { fields = Object.keys(request.postDataJSON()).length; } catch { /* Len počet, nikdy raw payload. */ }
      if (fields === 7) restoreIncoming += 1;
      else if (fields === 1) singleIncoming += 1;
      else otherIncoming += 1;
    });
    await page.route('**/*', async route => {
      const request = route.request(); const url = new URL(request.url()); const method = request.method();
      if (url.origin !== ORIGIN) { unexpected += 1; await route.abort(); return; }
      if (url.pathname === '/api/auth/csrf-token/' && method === 'GET') {
        csrf += 1;
        await route.fulfill({ status: 200, contentType: 'application/json',
          headers: { 'Set-Cookie': `csrftoken=${PRIVATE}; Path=/; Secure; SameSite=Lax` },
          body: JSON.stringify({ csrf_token: PRIVATE }) });
      } else if (url.pathname === NOTIFICATION_SETTINGS_PATH && method === 'GET') {
        documents += 1;
        await route.fulfill({ status: 200, contentType: 'text/html',
          body: syntheticCategoryPage(categoryMode, categoryMode === 'reload-stale' && documents > 1) });
      } else if (url.pathname === PREFERENCES_PATH && ['GET', 'PATCH'].includes(method)) {
        if (method === 'GET') gets += 1;
        else {
          const payload = request.postDataJSON(); const fields = Object.keys(payload).length;
          csrfPresent &&= Boolean(request.headers()['x-csrftoken']);
          if (fields === 7) {
            restores += 1;
            if (categoryMode === 'restore-status') {
              await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ private: PRIVATE }) }); return;
            }
            if (categoryMode !== 'restore-ignored') Object.assign(state, payload);
            if (categoryMode === 'restore-shape') {
              await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ private: PRIVATE }) }); return;
            }
            if (categoryMode === 'restore-ignored') {
              await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(original) }); return;
            }
          } else {
            uiPatches += 1; Object.assign(state, payload);
            if (categoryMode === 'change-status') {
              await route.fulfill({ status: 500, headers: { 'X-App-Duration-Ms': '1' },
                contentType: 'application/json', body: JSON.stringify({ private: PRIVATE }) }); return;
            }
            if (categoryMode === 'change-network') { await route.abort(); return; }
            if (categoryMode === 'change-proxy') {
              await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ private: PRIVATE }) }); return;
            }
            if (categoryMode.startsWith('change-redirect-')) {
              // Overuje sa prijatie prvej 3xx odpovede; nie živé presmerovanie alebo sieťový server.
              await route.fulfill({ status: categoryMode === 'change-redirect-temporary' ? 307 : 308,
                headers: { 'X-App-Duration-Ms': '1' }, contentType: 'application/json',
                body: JSON.stringify({ private: PRIVATE }) }); return;
            }
          }
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...state, private: PRIVATE }) });
      } else if (url.pathname === '/favicon.ico') await route.fulfill({ status: 204 });
      else { unexpected += 1; await route.abort(); }
    });
    try { await useFixture(); } finally {
      const restored = KEYS.every(key => state[key] === original[key]);
      console.log(`[CATEGORY-SELFTEST] mode=${categoryMode} restored=${restored} gets=${gets} ui=${uiPatches} restore=${restores} docs=${documents} csrf=${csrf} csrfPresent=${csrfPresent} single=${singleIncoming} other=${otherIncoming} seven=${restoreIncoming} touch=${trustedTouch} mouse=${trustedMouse} unexpected=${unexpected}`);
    }
  }, { auto: true }],
});

test.use({ serviceWorkers: 'block' });

for (const mode of CATEGORY_MODES) {
  test.describe(`[${mode}]`, () => {
    test.use({ categoryMode: mode });
    test('UI kategória a kontrolovaný návrat', async ({ page, changeNotificationCategory }) => {
      await changeNotificationCategory();
      if (mode === 'body-failure') throw new Error('SYNTHETIC_UI_BODY_FAILURE');
      if (mode === 'body-timeout') await page.waitForTimeout(20_000); // Len úmyselný timeout riadenej lokálnej kontroly.
    });
  });
}
