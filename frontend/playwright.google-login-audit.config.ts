import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

// The audit needs an anonymous start, not the shared authenticated setup or
// persisted cookie snapshot. Keep the production origin and mandatory engines.
export default defineConfig({
  ...baseConfig,
  globalSetup: undefined,
  testMatch: '**/google-login-completion.spec.ts',
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...baseConfig.use,
    storageState: { cookies: [], origins: [] },
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
});
