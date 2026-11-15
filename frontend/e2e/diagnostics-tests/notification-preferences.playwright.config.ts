import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** Riadené chyby overujú finally a izoláciu projektov, nikdy nie živú aplikáciu. */
export default defineConfig({
  testDir: __dirname, testMatch: 'notification-preferences.scenario.ts',
  outputDir: path.resolve(__dirname, '../../test-results/notification-preferences-selftest'),
  timeout: 5000, workers: 1, retries: 0, reporter: [['json']],
  use: { baseURL: 'https://stunning-inspiration-svap.up.railway.app',
    storageState: { cookies: [], origins: [] }, actionTimeout: 1000, navigationTimeout: 1000,
    serviceWorkers: 'block', trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 15'] } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
