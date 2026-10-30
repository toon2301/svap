import { test as base } from '@playwright/test';
import { captureWithin } from './evidence-deadline';
import { observePage, reportFailureEvidence } from './page-activity';
import { formatSessionDiagnostics, readSessionDiagnostics } from './session-diagnostics';

export * from '@playwright/test';

// Playwright 1.63 inak aj pri trace/screenshot=off automaticky číta ariaSnapshot
// do error-context. Pôvodné chyby tým nemeníme; surový report stále nie je na zdieľanie.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

/**
 * Pozorovanie začína pred beforeEach vrátane prípravy údajov. Nevytvára vlastný
 * browser context, nemení cookies, nevolá API a nemení asercie ani ich časovanie.
 */
export const test = base.extend<{ _safeFailureEvidence: void }>({
  trace: 'off',
  screenshot: 'off',
  video: 'off',
  _safeFailureEvidence: [async ({ page, storageState }, use, testInfo) => {
    observePage(page);
    const firstObservedAt = Date.now();
    const readSnapshot = () => typeof storageState === 'string'
      ? readSessionDiagnostics(storageState) : Promise.resolve(null);
    const atStart = await captureWithin(readSnapshot, 1000);
    try {
      await use();
    } finally {
      if (testInfo.status !== 'skipped' && testInfo.status !== testInfo.expectedStatus) {
        const failureObservedAt = Date.now();
        const atFailure = await captureWithin(readSnapshot, 1000);
        // Ide o čas prvého pozorovania už vytvoreného kontextu a snímky sidecaru,
        // nie o dôkaz, aká generácia cookies bola na kontext aplikovaná.
        const sessionEvidence = [
          `[E2E-CONTEXT] moment=first-observed at=${firstObservedAt} relation=temporal-only`,
          formatSessionDiagnostics(atStart, firstObservedAt),
          `[E2E-CONTEXT] moment=failure-observed at=${failureObservedAt} relation=temporal-only`,
          formatSessionDiagnostics(atFailure, failureObservedAt),
        ].join('\n');
        await reportFailureEvidence(page, testInfo, sessionEvidence);
      }
    }
  }, { auto: true }],
});
