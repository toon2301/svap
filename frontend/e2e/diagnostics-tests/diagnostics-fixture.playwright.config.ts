import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** Iba syntetický self-test infraštruktúry: bez aplikácie, prihlásenia a čítania .env. */
export default defineConfig({
  testDir: __dirname,
  testMatch: 'diagnostic-fixture.scenario.ts',
  outputDir: path.resolve(__dirname, '../../test-results/diagnostics-fixture'),
  workers: 1,
  retries: 0,
  timeout: 15_000,
  expect: { timeout: 3_000 },
  forbidOnly: true,
  reporter: [['json']],
  use: {
    baseURL: 'https://diagnostic.invalid',
    storageState: { cookies: [], origins: [] },
    serviceWorkers: 'block',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 15'] } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
