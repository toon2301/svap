import path from 'node:path';
import { defineConfig } from '@playwright/test';
import standard from '../playwright.config';

const chromium = standard.projects?.find(project => project.name === 'chromium-desktop');
if (!chromium) throw new Error('Chýba pôvodný Chromium projekt pre API skúšku.');

// Zápis volieb nepatrí do bežného plného behu. Pri chybe tu nepokračujú iné špecy.
// Bežný global setup, účet, prehliadač aj timeouty ostávajú nezmenené.
export default defineConfig({
  ...standard,
  testDir: __dirname,
  testMatch: 'notification-preferences.api.ts',
  globalSetup: path.resolve(__dirname, 'global-setup.ts'),
  outputDir: path.resolve(__dirname, '../test-results/notification-preferences-api'),
  projects: [chromium],
  workers: 1,
  retries: 0,
  maxFailures: 1,
});
