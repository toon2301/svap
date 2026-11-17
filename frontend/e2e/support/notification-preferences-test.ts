import path from 'node:path';
import { test as base } from './diagnostic-test';
import { notificationPreferencesTransport } from './notification-preferences-transport';
import { withNotificationPreferenceRoundTrip, type NotificationPreferenceKey } from './notification-preferences-roundtrip';

type PreferencesFixtures = { preferenceKey: NotificationPreferenceKey; verifyPreferenceChange: () => Promise<void> };

/** Upratanie je vo fixture finally, nie v časovo vyčerpanom tele testu. */
export const test = base.extend<PreferencesFixtures>({
  preferenceKey: ['notify_likes', { option: true }],
  verifyPreferenceChange: async ({ page, baseURL, preferenceKey }, runFixture, testInfo) => {
    // Aj WebKit musí overiť transport a návrat; jeden pracovník drží projekty za sebou.
    if (!['webkit-desktop', 'webkit-mobile', 'chromium-desktop'].includes(testInfo.project.name)) {
      throw new Error('API skúška vyžaduje jeden z troch podporovaných projektov.');
    }
    const configs = ['../notification-preferences.playwright.config.ts', '../diagnostics-tests/notification-preferences.playwright.config.ts']
      .map(file => path.resolve(__dirname, file));
    if (!testInfo.config.configFile || !configs.includes(path.normalize(testInfo.config.configFile))) {
      throw new Error('API skúška vyžaduje vlastnú konfiguráciu s rodičovskou poistkou opakovania.');
    }
    if (testInfo.config.workers !== 1 || testInfo.retry !== 0 || testInfo.project.retries !== 0
      || testInfo.project.repeatEach !== 1 || testInfo.repeatEachIndex !== 0) {
      throw new Error('Zápis volieb vyžaduje workers=1, retries=0 a repeat-each=1; súbežný alebo opakovaný beh je zakázaný.');
    }
    if (baseURL !== 'https://stunning-inspiration-svap.up.railway.app') {
      throw new Error('API skúška je určená pre dohodnuté nasadenie Railway.');
    }
    const response = await page.goto('/api/auth/csrf-token/', { waitUntil: 'domcontentloaded' });
    if (response?.status() !== 200 || new URL(page.url()).origin !== baseURL
      || new URL(page.url()).pathname !== '/api/auth/csrf-token/') {
      throw new Error('Príprava CSRF pre API skúšku neuspela.');
    }
    const timeout = testInfo.project.use.actionTimeout;
    if (typeof timeout !== 'number') throw new Error('Chýba pôvodný actionTimeout API skúšky.');
    await withNotificationPreferenceRoundTrip(
      notificationPreferencesTransport(page, timeout), preferenceKey, runFixture,
      state => { console.log(`[E2E-PREFERENCES] restored=${state} fields=7`); },
    );
  },
});
