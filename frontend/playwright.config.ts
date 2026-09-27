import fs from 'fs';
import path from 'path';
import { defineConfig, devices } from '@playwright/test';

// Prihlasovacie údaje pre globalSetup z .env.e2e — funguje lokálne aj v Dockeri
// (frontend je pripojený ako volume). Premenné už nastavené v prostredí
// (napr. neskôr CI secrets) majú prednosť, súbor ich neprepíše.
const envFile = path.join(__dirname, '.env.e2e');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

// E2E testy bežia priamo proti produkčnej Railway inštancii — lokálne sa nič
// nespúšťa, preto config nemá webServer sekciu. Timeouty a retry počítajú
// s reálnou sieťou.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://stunning-inspiration-svap.up.railway.app',
    // Uloží ho globalSetup; platí pre všetky projekty.
    storageState: path.join(__dirname, 'e2e/.auth/user.json'),
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 15'] },
    },
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
