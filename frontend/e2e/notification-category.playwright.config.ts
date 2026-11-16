import path from 'node:path';
import { defineConfig } from '@playwright/test';
import standard from '../playwright.config';
import { requireSingleCategoryRun } from './support/notification-category-options';

requireSingleCategoryRun();
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

const projects = ['webkit-desktop', 'webkit-mobile'].map(name => {
  const project = standard.projects?.find(item => item.name === name);
  if (!project) throw new Error(`Chýba povinný projekt UI skúšky: ${name}.`);
  return project;
});

/** Jeden účet, dva povinné WebKity za sebou. Chyba obnovy nesmie spustiť ďalší zápis. */
export default defineConfig({
  ...standard,
  testDir: __dirname,
  testMatch: 'notification-category.ui.ts',
  globalSetup: path.resolve(__dirname, 'global-setup.ts'),
  outputDir: path.resolve(__dirname, '../test-results/notification-category-ui'),
  projects,
  workers: 1,
  retries: 0,
  maxFailures: 1,
});
