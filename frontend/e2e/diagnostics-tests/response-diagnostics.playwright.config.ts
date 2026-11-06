import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** Len syntetická .invalid; bez aplikácie, prihlasovania, env a siete Railway. */
export default defineConfig({
  testDir: __dirname, testMatch: 'response-diagnostics.scenario.ts',
  outputDir: path.resolve(__dirname, '../../test-results/response-diagnostics-selftest'),
  workers: 1, retries: 0, timeout: 15_000, reporter: [['json']],
  use: { baseURL: 'https://diagnostic.invalid', storageState: { cookies: [], origins: [] },
    serviceWorkers: 'block', trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 15'] } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
