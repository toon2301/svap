import path from 'node:path';
import { test as base } from './diagnostic-test';
import { withNotificationCategoryChange } from './notification-category-roundtrip';
import { exerciseNotificationCategory } from './notification-category-ui';
import { CATEGORY_ORIGIN, CategoryWriteAudit, guardCategoryWrites } from './notification-category-writes';
import { notificationPreferencesTransport } from './notification-preferences-transport';

type Fixtures = { changeNotificationCategory: () => Promise<void> };

/** Bezpečnostné podmienky platia pred prvým API volaním, aj pri nesprávnom priamom CLI použití. */
export const test = base.extend<Fixtures>({
  serviceWorkers: 'block',
  changeNotificationCategory: async ({ page, baseURL, isMobile, browserName }, runFixture, testInfo) => {
    console.log(`[E2E-CATEGORY-RUN] workers=${testInfo.config.workers} maxFailures=${testInfo.config.maxFailures} repeat=${testInfo.project.repeatEach} index=${testInfo.repeatEachIndex} retries=${testInfo.project.retries} retry=${testInfo.retry}`);
    if (!['webkit-desktop', 'webkit-mobile'].includes(testInfo.project.name) || browserName !== 'webkit'
      || isMobile !== (testInfo.project.name === 'webkit-mobile')) {
      throw new Error('UI skúška 337 vyžaduje WebKit desktop alebo mobil.');
    }
    const configs = ['../notification-category.playwright.config.ts', '../diagnostics-tests/notification-category.playwright.config.ts']
      .map(file => path.resolve(__dirname, file));
    if (!testInfo.config.configFile || !configs.includes(path.normalize(testInfo.config.configFile))) {
      throw new Error('UI skúška vyžaduje vlastnú chránenú konfiguráciu.');
    }
    if (testInfo.config.workers !== 1 || testInfo.config.maxFailures !== 1 || testInfo.retry !== 0
      || testInfo.project.retries !== 0 || testInfo.project.repeatEach !== 1 || testInfo.repeatEachIndex !== 0) {
      throw new Error('UI zápis vyžaduje workers=1, retries=0, repeat-each=1 a max-failures=1.');
    }
    if (baseURL !== CATEGORY_ORIGIN) throw new Error('UI skúška je určená pre dohodnuté nasadenie Railway.');
    const timeout = testInfo.project.use.actionTimeout;
    if (typeof timeout !== 'number' || !Number.isSafeInteger(timeout) || timeout <= 0) {
      throw new Error('Chýba pôvodný konečný actionTimeout UI skúšky.');
    }
    const response = await page.goto('/api/auth/csrf-token/', { waitUntil: 'domcontentloaded' });
    const location = new URL(page.url());
    if (response?.status() !== 200 || location.origin !== baseURL || location.pathname !== '/api/auth/csrf-token/') {
      throw new Error('Príprava CSRF pre UI skúšku neuspela.');
    }
    let audit: CategoryWriteAudit | undefined;
    try {
      await withNotificationCategoryChange(notificationPreferencesTransport(page, timeout), async change => {
        audit = new CategoryWriteAudit(change);
        await guardCategoryWrites(page, audit);
        try {
          await runFixture(() => exerciseNotificationCategory(page, isMobile, change, audit!, timeout));
        } finally { audit.beginRestore(); }
      }, {
        report: state => { console.log(`[E2E-CATEGORY] restored=${state} fields=7`); },
        verifyWriteSafety: () => { audit!.assertRestoreSafe(); },
      });
    } finally { if (audit) { audit.seal(); console.log(audit.evidence()); } }
    // Route sa zámerne neodstraňuje pred zavretím kontextu: neskorý zápis zostane zablokovaný.
  },
});
