import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { test as base } from './diagnostic-test';
import { COMMENTS_ORIGIN, FeedCommentsSession } from './feed-comments-session';
import { feedCommentsTransport } from './feed-comments-transport';
import { FeedCommentsWriteAudit, guardFeedCommentWrites } from './feed-comments-writes';
import { exerciseOwnFeedComment } from './feed-comments-ui';

/** Samostatná API stránka ostáva stabilná aj keď sa testované UI zatvorí alebo naviguje. */
export const test = base.extend<{ createAndDeleteOwnComment: () => Promise<void>; reusePhotoPost: boolean }>({
  serviceWorkers: 'block',
  reusePhotoPost: [false, { option: true }],
  createAndDeleteOwnComment: async ({ page, context, baseURL, isMobile, browserName, reusePhotoPost }, runFixture, testInfo) => {
    // Pred API stránkou a zápismi: druhý scenár patrí iba presnému mobilnému rozloženiu.
    if (reusePhotoPost) {
      base.skip(testInfo.project.name !== 'webkit-mobile', 'Celý komentár na iPhone 15 – iba mobilný WebKit.');
      const viewport = page.viewportSize();
      if (viewport?.width !== 393 || viewport.height !== 659) throw new Error('Skúška 346 vyžaduje iPhone 15, 393 × 659.');
    }
    const projects = { 'webkit-desktop': 'webkit', 'webkit-mobile': 'webkit', 'chromium-desktop': 'chromium' };
    const configs = ['../feed-comments.playwright.config.ts', '../diagnostics-tests/feed-comments.playwright.config.ts']
      .map(file => path.resolve(__dirname, file));
    if (!Object.hasOwn(projects, testInfo.project.name) || projects[testInfo.project.name as keyof typeof projects] !== browserName
      || isMobile !== (testInfo.project.name === 'webkit-mobile') || !testInfo.config.configFile
      || !configs.includes(path.normalize(testInfo.config.configFile))) throw new Error('Komentárová skúška vyžaduje vlastnú chránenú konfiguráciu.');
    if (testInfo.config.workers !== 1 || testInfo.config.maxFailures !== 1 || testInfo.retry !== 0
      || testInfo.project.retries !== 0 || testInfo.project.repeatEach !== 1 || testInfo.repeatEachIndex !== 0) {
      throw new Error('Komentárové zápisy vyžadujú workers=1, retries=0, repeat-each=1 a max-failures=1.');
    }
    const timeout = testInfo.project.use.actionTimeout;
    if (baseURL !== COMMENTS_ORIGIN || typeof timeout !== 'number' || !Number.isSafeInteger(timeout) || timeout <= 0) {
      throw new Error('Komentárová skúška vyžaduje dohodnutý pôvod a pôvodný konečný actionTimeout.');
    }
    const apiPage = await context.newPage();
    const session: FeedCommentsSession = new FeedCommentsSession(feedCommentsTransport(apiPage, timeout, !reusePhotoPost), randomUUID(), {
      begin: () => audit.beginCleanup(), beforeDelete: () => audit.assertSafe(), afterDelete: () => audit.assertCleanupComplete(),
      report: state => { console.log(`[E2E-COMMENTS-CLEANUP] state=${state}`); },
    }, reusePhotoPost);
    const audit: FeedCommentsWriteAudit = new FeedCommentsWriteAudit(session);
    await guardFeedCommentWrites(context, audit);
    try {
      const response = await apiPage.goto('/api/auth/csrf-token/', { waitUntil: 'domcontentloaded' });
      const url = new URL(apiPage.url());
      if (response?.status() !== 200 || url.origin !== baseURL || url.pathname !== '/api/auth/csrf-token/') {
        throw new Error('Príprava CSRF komentárovej skúšky neuspela.');
      }
      await runFixture(() => exerciseOwnFeedComment(page, isMobile, session, audit, timeout));
    } finally {
      try { await session.cleanup(); } finally {
        audit.seal(); console.log(audit.evidence());
        try { await apiPage.close(); } catch { /* Zatvorenie nesmie prekryť výsledok upratania. */ }
      }
    }
  },
});
