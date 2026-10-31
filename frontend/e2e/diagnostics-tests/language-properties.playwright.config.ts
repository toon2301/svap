import { defineConfig, devices } from '@playwright/test';

/** Izolovaný pokus s gestami; žiadny globalSetup, .env ani prístup do aplikácie. */
export default defineConfig({
  testDir: __dirname, testMatch: 'language-properties.scenario.ts',
  outputDir: '/tmp/svap-language-properties',
  workers: 1, retries: 0, timeout: 60_000,
  expect: { timeout: 3_000 }, reporter: [['json']],
  use: {
    baseURL: 'https://diagnostic.invalid', storageState: { cookies: [], origins: [] },
    serviceWorkers: 'block', trace: 'off', screenshot: 'off', video: 'off', actionTimeout: 3000,
  },
  projects: [
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 15'] } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
