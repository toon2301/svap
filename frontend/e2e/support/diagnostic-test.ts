import { test as base } from '@playwright/test';
import { captureWithin } from './evidence-deadline';
import { observePage, reportFailureEvidence } from './page-activity';
import { formatSessionDiagnostics, readSessionDiagnostics } from './session-diagnostics';
import { observeCookieTimeline } from './cookie-timeline';

export * from '@playwright/test';

// Playwright 1.63 inak aj pri trace/screenshot=off automaticky číta ariaSnapshot
// do error-context. Pôvodné chyby tým nemeníme; surový report stále nie je na zdieľanie.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

/**
 * Pozorovanie začína pred beforeEach vrátane prípravy údajov. Nevytvára vlastný
 * browser context, nemení cookies, nevolá API a nemení asercie ani ich časovanie.
 * Voliteľná sonda 223 číta len názvy cookies cez SDK, bez čakania v scenári.
 */
export const test = base.extend<{ _safeFailureEvidence: void; cookieTimeline: boolean }>({
  cookieTimeline: [false, { option: true }],
  trace: 'off',
  screenshot: 'off',
  video: 'off',
  _safeFailureEvidence: [async ({ page, storageState, cookieTimeline }, runFixture, testInfo) => {
    observePage(page);
    let timeline: ReturnType<typeof observeCookieTimeline> | null = null;
    try { if (cookieTimeline) timeline = observeCookieTimeline(page); } catch { /* Pasívne, best-effort. */ }
    const firstObservedAt = Date.now();
    const readSnapshot = () => typeof storageState === 'string'
      ? readSessionDiagnostics(storageState) : Promise.resolve(null);
    const atStart = await captureWithin(readSnapshot, 1000);
    try {
      await runFixture();
    } finally {
      let cookieEvidence = '';
      try { cookieEvidence = timeline?.stop() ?? ''; } catch { /* Neprekryť pôvodný výsledok. */ }
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
          cookieEvidence,
        ].join('\n');
        await reportFailureEvidence(page, testInfo, sessionEvidence);
      } else if (cookieEvidence) {
        // Aj úspešný pokus sa počíta do diagnostického porovnania. Nejde o blok pádu.
        try { console.log(cookieEvidence); } catch { /* Diagnostika nesmie meniť výsledok. */ }
      }
    }
  }, { auto: true }],
});
