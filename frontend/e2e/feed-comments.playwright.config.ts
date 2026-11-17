import path from 'node:path';
import { defineConfig } from '@playwright/test';
import standard from '../playwright.config';
import { requireSingleCommentRun } from './support/feed-comments-options';

requireSingleCommentRun();
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';
const projects = ['webkit-desktop', 'webkit-mobile', 'chromium-desktop'].map(name => {
  const project = standard.projects?.find(item => item.name === name);
  if (!project) throw new Error(`Chýba povinný projekt komentárovej skúšky: ${name}.`);
  return project;
});

export default defineConfig({
  ...standard, testDir: __dirname, testMatch: 'feed-comments.ui.ts',
  globalSetup: path.resolve(__dirname, 'global-setup.ts'),
  outputDir: path.resolve(__dirname, '../test-results/feed-comments-ui'),
  projects, workers: 1, retries: 0, maxFailures: 1,
});
