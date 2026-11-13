import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** Izolovaný kontrakt pomocníka 328; žiadny global setup, env, účet alebo Railway. */
export default defineConfig({
  testDir: __dirname, testMatch: 'watch-manager-ready.scenario.ts',
  outputDir: path.resolve(__dirname, '../../test-results/watch-manager-ready-selftest'),
  workers: 1, retries: 0, timeout: 15_000, expect: { timeout: 1000 }, reporter: [['json']],
  use: { storageState: { cookies: [], origins: [] }, serviceWorkers: 'block',
    trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 15'] } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
