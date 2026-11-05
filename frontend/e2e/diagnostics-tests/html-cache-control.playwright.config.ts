import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** Izolované HTML odpovede; bez aplikácie, prihlasovania, .env a kontaktu s Railway. */
export default defineConfig({
  testDir: __dirname,
  testMatch: 'html-cache-control.scenario.ts',
  outputDir: path.resolve(__dirname, '../../test-results/html-cache-control-selftest'),
  workers: 1, retries: 0, timeout: 15_000,
  reporter: [['json']],
  use: {
    baseURL: 'https://diagnostic.invalid', storageState: { cookies: [], origins: [] },
    serviceWorkers: 'block', trace: 'off', screenshot: 'off', video: 'off',
  },
  projects: [
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 15'] } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
