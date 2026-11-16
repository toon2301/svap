import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { requireSingleCategoryRun } from '../support/notification-category-options';

requireSingleCategoryRun();

if (fs.existsSync(path.resolve(__dirname, '../../.env.e2e')) || fs.existsSync(path.resolve(__dirname, '../.auth/user.json'))) {
  throw new Error('Lokálna UI kontrola odmieta env alebo uloženú reláciu.');
}

/** Čerstvé prázdne kontexty; každý riadený pád beží samostatne s maxFailures=1. */
export default defineConfig({
  testDir: __dirname, testMatch: 'notification-category.scenario.ts',
  outputDir: '/tmp/notification-category-selftest',
  timeout: 5000, expect: { timeout: 1000 }, workers: 1, retries: 0, maxFailures: 1,
  reporter: [['json']],
  use: { baseURL: 'https://stunning-inspiration-svap.up.railway.app', storageState: { cookies: [], origins: [] },
    actionTimeout: 1000, navigationTimeout: 1000, serviceWorkers: 'block', trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 15'] } },
  ],
});
