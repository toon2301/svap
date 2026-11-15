import path from 'node:path';
import { defineConfig } from '@playwright/test';
import standard from '../playwright.config';

const projects = ['webkit-desktop', 'webkit-mobile', 'chromium-desktop'].map(name => {
  const project = standard.projects?.find(item => item.name === name);
  if (!project) throw new Error(`Chýba povinný projekt API skúšky: ${name}.`);
  return project;
});

// Zápis volieb nepatrí do bežného plného behu. Pri chybe tu nepokračujú iné špecy.
// Bežný global setup, účet, prehliadač aj timeouty ostávajú nezmenené.
export default defineConfig({
  ...standard,
  testDir: __dirname,
  testMatch: 'notification-preferences.api.ts',
  globalSetup: path.resolve(__dirname, 'global-setup.ts'),
  outputDir: path.resolve(__dirname, '../test-results/notification-preferences-api'),
  projects,
  workers: 1,
  retries: 0,
  maxFailures: 1,
});
